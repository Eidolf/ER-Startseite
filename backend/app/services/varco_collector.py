import asyncio
import contextlib
import datetime
import ipaddress
import json
import os
import re
import shutil
import time
import urllib.parse
from typing import Any

import httpx
import structlog

from app.repositories.repos import MonitoringRepository
from app.schemas.monitoring import MonitoringEntity
from app.services.log_service import add_system_log

logger = structlog.get_logger()

_collector_task: asyncio.Task[None] | None = None
_stop_event: asyncio.Event = asyncio.Event()
_last_active_timestamp: float = 0.0


def touch_monitoring_active() -> None:
    global _last_active_timestamp
    _last_active_timestamp = time.time()


def is_monitoring_active() -> bool:
    """Returns True if a frontend client sent an active heartbeat within the last 45 seconds."""
    global _last_active_timestamp
    return (time.time() - _last_active_timestamp) < 45.0


def _is_safe_url(url_str: str) -> bool:
    """Validates that a URL uses http/https scheme and targets a public IP/hostname."""
    try:
        parsed = urllib.parse.urlparse(url_str)
        if parsed.scheme not in ("http", "https"):
            return False
        hostname = parsed.hostname
        if not hostname:
            return False

        # Prevent loopback, private, or link-local targets
        if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
            return False

        try:
            ip = ipaddress.ip_address(hostname)
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
            ):
                return False
        except ValueError:
            # Hostname is a domain name, allowed
            pass

        return True
    except Exception:
        return False


def _parse_url_params(
    url: str, settings_dict: dict[str, Any]
) -> tuple[str, str, str, str]:
    """Parses shareCode, authorityId, claimSecret, bridgeUrl from url or settings."""
    authority_id = (
        settings_dict.get("authorityId") or settings_dict.get("authority_id") or ""
    )
    share_code = settings_dict.get("shareCode") or settings_dict.get("share_code") or ""
    claim_secret = (
        settings_dict.get("claimSecret") or settings_dict.get("claim_secret") or ""
    )
    bridge_url = settings_dict.get("bridgeUrl") or settings_dict.get("bridge_url") or ""

    if url:
        try:
            url_obj = urllib.parse.urlparse(url)
            path_parts = [p for p in url_obj.path.split("/") if p]
            if path_parts:
                s_code = (
                    path_parts[1]
                    if (len(path_parts) >= 2 and path_parts[0] == "share")
                    else path_parts[0]
                )
                if s_code:
                    share_code = s_code

            search_params = urllib.parse.parse_qs(url_obj.query)
            fragment_str = url_obj.fragment
            hash_params = urllib.parse.parse_qs(fragment_str)
            if not hash_params and "=" in fragment_str:
                frag_k, _, frag_v = fragment_str.partition("=")
                if frag_k and frag_v:
                    hash_params[frag_k] = [frag_v]

            def get_p(key: str) -> str:
                return (search_params.get(key) or hash_params.get(key) or [""])[0]

            authority_id = (
                get_p("authority")
                or get_p("authority_id")
                or get_p("authorityId")
                or authority_id
            )
            claim_secret = get_p("claim") or get_p("key") or claim_secret
            b_url = (
                get_p("bridge")
                or get_p("bridge_url")
                or f"{url_obj.scheme}://{url_obj.netloc}"
            )
            if b_url:
                bridge_url = b_url
        except Exception as parse_err:
            logger.debug(
                "URL parsing exception in _parse_url_params", exc_info=parse_err
            )

    if not bridge_url and url:
        try:
            p = urllib.parse.urlparse(url)
            bridge_url = f"{p.scheme}://{p.netloc}"
        except Exception as parse_err:
            logger.debug("Bridge URL fallback parsing exception", exc_info=parse_err)
            bridge_url = "https://varco-bridge.andreabaccega.com"

    return share_code, authority_id, claim_secret, bridge_url


async def _fetch_varco_data(
    url: str, settings_dict: dict[str, Any]
) -> list[dict[str, Any]]:
    """Connects to Varco Bridge or HTTP share URL and extracts entities."""
    clean_url = url.strip()
    share_code, authority_id, claim_secret, bridge_url = _parse_url_params(
        clean_url, settings_dict
    )
    extracted_entities: list[dict[str, Any]] = []

    add_system_log(
        "DEBUG",
        "Varco Collector starting fetch check",
        {
            "bridge_url": bridge_url,
            "authority_id": authority_id,
            "has_share_code": bool(share_code),
            "has_claim_secret": bool(claim_secret),
            "has_url": bool(clean_url),
        },
    )

    # 1. Direct Varco Bridge HTTP/JSON endpoint query
    api_endpoint = ""
    log_endpoint = ""
    if not (bridge_url and authority_id and share_code):
        add_system_log(
            "WARNING",
            "Varco Collector skipped direct fetch: missing bridge_url, authority_id, or share_code",
            {
                "has_bridge_url": bool(bridge_url),
                "has_authority_id": bool(authority_id),
                "has_share_code": bool(share_code),
            },
        )

    if bridge_url and authority_id and share_code and _is_safe_url(bridge_url):
        try:
            base_b_url = (
                bridge_url.replace("wss://", "https://")
                .replace("ws://", "http://")
                .rstrip("/")
            )
            api_endpoint = (
                f"{base_b_url}/api/v1/share/{authority_id}/{share_code}/states"
            )
            if claim_secret:
                api_endpoint = (
                    f"{api_endpoint}?claim={urllib.parse.quote(claim_secret)}"
                )

            log_endpoint = (
                f"{base_b_url}/api/v1/share/{authority_id}/{share_code}/states?claim=REDACTED"
                if claim_secret
                else api_endpoint
            )

            if _is_safe_url(api_endpoint):
                async with httpx.AsyncClient(
                    timeout=10.0, follow_redirects=False
                ) as client:
                    resp = await client.get(api_endpoint)
                    add_system_log(
                        "INFO" if resp.status_code == 200 else "WARNING",
                        f"Varco Bridge API response HTTP {resp.status_code}",
                        {"endpoint": log_endpoint, "status": resp.status_code},
                    )
                    if resp.status_code == 200:
                        text_body = resp.text.strip()
                        if text_body.startswith("{") or text_body.startswith("["):
                            try:
                                raw_data = json.loads(text_body)
                                states = (
                                    raw_data.get("states", raw_data)
                                    if isinstance(raw_data, dict)
                                    else raw_data
                                )
                                if isinstance(states, dict):
                                    for eid, ent_data in states.items():
                                        val_state = (
                                            ent_data.get("state")
                                            if isinstance(ent_data, dict)
                                            else ent_data
                                        )
                                        unit = (
                                            ent_data.get("attributes", {}).get(
                                                "unit_of_measurement"
                                            )
                                            if isinstance(ent_data, dict)
                                            else None
                                        )
                                        name = (
                                            ent_data.get("attributes", {}).get(
                                                "friendly_name"
                                            )
                                            if isinstance(ent_data, dict)
                                            else None
                                        ) or eid.split(".")[-1].replace(
                                            "_", " "
                                        ).title()
                                        extracted_entities.append(
                                            {
                                                "id": str(eid),
                                                "name": str(name),
                                                "state": (
                                                    val_state
                                                    if val_state is not None
                                                    else "N/A"
                                                ),
                                                "unit": str(unit) if unit else None,
                                                "domain": (
                                                    "binary_sensor"
                                                    if str(eid).startswith(
                                                        "binary_sensor."
                                                    )
                                                    else "sensor"
                                                ),
                                            }
                                        )
                            except Exception as json_err:
                                logger.debug(
                                    "Varco Bridge HTTP response JSON parse info",
                                    error=str(json_err),
                                )
                        else:
                            add_system_log(
                                "DEBUG",
                                "Varco Opaque Bridge response (Browser Worker Sync Active)",
                                {"body": text_body[:100]},
                            )
        except Exception as e:
            add_system_log(
                "WARNING",
                f"Varco Bridge API request failed: {e}",
                {"endpoint": log_endpoint or api_endpoint, "error": str(e)},
            )
            logger.debug("Varco Bridge API endpoint query info", error=str(e))

    # 2. Try HTML section parsing or share page grant parsing from share URL as fallback
    target_share_url = clean_url
    if (
        (not target_share_url or "/api/v1" in target_share_url)
        and bridge_url
        and authority_id
        and share_code
    ):
        base_b_url = (
            bridge_url.replace("wss://", "https://")
            .replace("ws://", "http://")
            .rstrip("/")
        )
        target_share_url = f"{base_b_url}/share/{share_code}?authority={authority_id}"

    add_system_log(
        "DEBUG",
        "Varco Collector share page fallback target check",
        {
            "target_share_url": target_share_url,
            "has_entities_already": bool(extracted_entities),
        },
    )

    if not extracted_entities and target_share_url and _is_safe_url(target_share_url):
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(target_share_url)
                add_system_log(
                    "DEBUG",
                    f"Varco Collector share page HTTP {resp.status_code}",
                    {"target_url": target_share_url, "status": resp.status_code},
                )
                if resp.status_code == 200:
                    body_str = resp.text
                    add_system_log(
                        "DEBUG",
                        "Varco Collector share page HTML received",
                        {"length": len(body_str), "snippet": body_str[:400]},
                    )
                    # 1. Standard Varco HTML section tags
                    section_pattern = (
                        r'<section[^>]*data-entity="([^"]+)"[^>]*>(.*?)</section>'
                    )
                    sections = re.findall(section_pattern, body_str, re.DOTALL)
                    if sections:
                        for ent_id, sec_body in sections:
                            ent_id = ent_id.strip()
                            st_match = re.search(
                                r'class="varco-card__state">([^<]+)</span>', sec_body
                            )
                            name_match = re.search(
                                r'class="varco-card__title">([^<]+)</div>', sec_body
                            )
                            unit_match = re.search(
                                r'class="varco-card__unit">([^<]+)</span>', sec_body
                            )

                            if st_match:
                                extracted_entities.append(
                                    {
                                        "id": ent_id,
                                        "name": (
                                            name_match.group(1).strip()
                                            if name_match
                                            else ent_id.split(".")[-1]
                                            .replace("_", " ")
                                            .title()
                                        ),
                                        "state": st_match.group(1).strip(),
                                        "unit": (
                                            unit_match.group(1).strip()
                                            if unit_match
                                            else None
                                        ),
                                        "domain": (
                                            "binary_sensor"
                                            if ent_id.startswith("binary_sensor.")
                                            else "sensor"
                                        ),
                                    }
                                )

                    # 2. Extract JSON payload blobs or state objects in script tags/data attributes
                    if not extracted_entities:
                        all_json_blobs = re.findall(
                            r"({[^{}]*\"entity_id\"[^{}]*}|{[^{}]*\"id\":\s*\"(?:sensor|binary_sensor)\.[^\"]+\"[^{}]*})",
                            body_str,
                            re.DOTALL,
                        )
                        for blob in all_json_blobs:
                            try:
                                b_data = json.loads(blob)
                                eid = b_data.get("entity_id") or b_data.get("id")
                                if eid:
                                    st = b_data.get("state")
                                    snap = b_data.get("state_snapshot")
                                    if (
                                        isinstance(snap, dict)
                                        and snap.get("state") is not None
                                    ):
                                        st = snap.get("state")
                                    u = b_data.get("unit_of_measurement") or b_data.get(
                                        "unit"
                                    )
                                    extracted_entities.append(
                                        {
                                            "id": str(eid),
                                            "name": str(
                                                b_data.get("name")
                                                or b_data.get("friendly_name")
                                                or str(eid)
                                                .split(".")[-1]
                                                .replace("_", " ")
                                                .title()
                                            ),
                                            "state": st if st is not None else "N/A",
                                            "unit": str(u) if u else None,
                                            "domain": (
                                                "binary_sensor"
                                                if str(eid).startswith("binary_sensor.")
                                                else "sensor"
                                            ),
                                        }
                                    )
                            except Exception:
                                pass
        except Exception as e:
            logger.debug("Varco share URL fallback query info", error=str(e))

    if extracted_entities:
        add_system_log(
            "INFO",
            f"Varco Collector extracted {len(extracted_entities)} entities from share fallback",
            {"count": len(extracted_entities)},
        )

    return extracted_entities


_sidecar_process: asyncio.subprocess.Process | None = None
_first_sync_reported: bool = False


async def _ensure_sidecar_running(enabled: bool, has_share_link: bool) -> None:
    """Starts or stops backend/varco_worker.js Node.js process conditionally."""
    global _sidecar_process

    should_run = enabled and has_share_link

    if should_run:
        if _sidecar_process is None or _sidecar_process.returncode is not None:
            script_path = os.path.abspath(
                os.path.join(os.path.dirname(__file__), "../../varco_worker.js")
            )
            node_binary = shutil.which("node") or "/usr/bin/node"
            if os.path.exists(script_path):
                try:
                    _sidecar_process = await asyncio.create_subprocess_exec(
                        node_binary,
                        script_path,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    add_system_log(
                        "INFO",
                        "Varco Node.js Sidecar Worker started",
                        {"pid": _sidecar_process.pid, "path": script_path},
                    )

                    async def _read_stream(
                        stream: asyncio.StreamReader | None, is_err: bool
                    ) -> None:
                        if not stream:
                            return
                        while not stream.at_eof():
                            line = await stream.readline()
                            if line:
                                txt = line.decode().strip()
                                if txt:
                                    add_system_log(
                                        (
                                            "WARNING"
                                            if is_err
                                            else (
                                                "INFO"
                                                if (
                                                    "PAIRING" in txt
                                                    or "connected" in txt
                                                )
                                                else "DEBUG"
                                            )
                                        ),
                                        f"Varco Worker {'Err' if is_err else 'Log'}: {txt}",
                                        {"output" if not is_err else "error": txt},
                                    )

                    async def _read_sidecar_logs(
                        proc: asyncio.subprocess.Process,
                    ) -> None:
                        await asyncio.gather(
                            _read_stream(proc.stdout, False),
                            _read_stream(proc.stderr, True),
                        )

                    asyncio.create_task(_read_sidecar_logs(_sidecar_process))
                except Exception as err:
                    add_system_log(
                        "WARNING",
                        f"Failed to start Varco Node.js Sidecar Worker: {err}",
                        {"error": str(err)},
                    )
    elif _sidecar_process is not None and _sidecar_process.returncode is None:
        try:
            _sidecar_process.terminate()
            await asyncio.wait_for(_sidecar_process.wait(), timeout=3.0)
        except Exception:
            with contextlib.suppress(Exception):
                _sidecar_process.kill()
        _sidecar_process = None
        add_system_log(
            "INFO",
            "Varco Node.js Sidecar Worker stopped (Monitoring or Share Link disabled)",
            {},
        )


async def _query_sidecar_telemetry() -> list[dict[str, Any]]:
    """Queries internal Node.js Varco Sidecar worker endpoint on 127.0.0.1:8089."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get("http://127.0.0.1:8089/telemetry")
            if resp.status_code == 200:
                data = resp.json()
                entities = data.get("entities", [])
                success = data.get("success", True)
                msg = (
                    f"Varco Sidecar Telemetry queried: online={data.get('online')}, "
                    f"success={success}, count={len(entities)}"
                )
                add_system_log(
                    "DEBUG",
                    msg,
                    {
                        "online": data.get("online"),
                        "success": success,
                        "count": len(entities),
                    },
                )
                if success and entities and isinstance(entities, list):
                    return entities
    except Exception as sidecar_err:
        logger.debug(
            "Varco Sidecar Telemetry query failed",
            exc_info=True,
            error=str(sidecar_err),
        )
        add_system_log(
            "DEBUG",
            f"Varco Sidecar Telemetry query info: {sidecar_err}",
            {"error": str(sidecar_err)},
        )
    return []


async def _run_collector_loop() -> None:
    logger.info("Varco Background Collector started")
    repo = MonitoringRepository()

    while not _stop_event.is_set():
        try:
            async with repo.lock:
                config = await repo.get_config()

            # Pause telemetry polling if monitoring overlay is not active on any client
            if not is_monitoring_active():
                for _ in range(5):
                    if _stop_event.is_set():
                        break
                    await asyncio.sleep(1)
                continue

            varco_provider = next(
                (p for p in config.providers if p.type == "varco" and p.enabled),
                None,
            )
            has_link = bool(
                varco_provider
                and (
                    varco_provider.url
                    or (varco_provider.settings or {}).get("shareCode")
                )
            )

            # Ensure Sidecar worker is running ONLY if enabled and share link is present
            await _ensure_sidecar_running(config.enabled, has_link)

            if config.enabled and varco_provider and has_link:
                sidecar_collected = await _query_sidecar_telemetry()
                collected = sidecar_collected or await _fetch_varco_data(
                    varco_provider.url or "", varco_provider.settings or {}
                )
                if collected:
                    async with repo.lock:
                        fresh_config = await repo.get_config()
                        ent_map = {e.id: e for e in fresh_config.entities}
                        cards = list(fresh_config.cards)
                        existing_card_ids = {c.id for c in cards}
                        iso_now = datetime.datetime.now(
                            datetime.timezone.utc
                        ).isoformat()

                        has_changed = False
                        for c in collected:
                            eid = c["id"]
                            existing = ent_map.get(eid)
                            new_st = c.get("state", "N/A")
                            new_u = c.get("unit_of_measurement") or c.get("unit")

                            if (
                                not existing
                                or existing.state != new_st
                                or existing.unit_of_measurement != new_u
                            ):
                                has_changed = True

                            ent_map[eid] = MonitoringEntity(
                                id=eid,
                                provider_id="varco-server",
                                name=c.get("name")
                                or (existing.name if existing else eid),
                                domain=c.get("domain") or "sensor",
                                value_type=(
                                    "numeric"
                                    if isinstance(c.get("state"), (int, float))
                                    else "string"
                                ),
                                state=new_st,
                                unit_of_measurement=new_u
                                or (existing.unit_of_measurement if existing else None),
                                last_updated=(
                                    iso_now
                                    if (not existing or existing.state != new_st)
                                    else (
                                        existing.last_updated if existing else iso_now
                                    )
                                ),
                            )

                            # Auto-create missing card for newly discovered entity
                            card_id = f"card-{eid.replace('.', '-')}"
                            if card_id not in existing_card_ids:
                                is_bin = eid.startswith("binary_sensor.")
                                card_type = (
                                    "status_beacon"
                                    if (
                                        is_bin
                                        or any(
                                            k in eid
                                            for k in [
                                                "status",
                                                "online",
                                                "state",
                                                "virtualmachine",
                                                "server",
                                                "icmp",
                                            ]
                                        )
                                    )
                                    else (
                                        "live_traffic"
                                        if any(
                                            k in eid
                                            for k in [
                                                "download",
                                                "upload",
                                                "speed",
                                                "bandwidth",
                                                "traffic",
                                            ]
                                        )
                                        else (
                                            "gauge"
                                            if any(
                                                k in eid
                                                for k in [
                                                    "ping",
                                                    "latency",
                                                    "cpu",
                                                    "temp",
                                                    "memory",
                                                    "usage",
                                                ]
                                            )
                                            else "metric_card"
                                        )
                                    )
                                )
                                from app.schemas.monitoring import MonitoringCard

                                cards.append(
                                    MonitoringCard(
                                        id=card_id,
                                        title=c.get("name")
                                        or eid.split(".")[-1].replace("_", " ").title(),
                                        card_type=card_type,
                                        entity_ids=[eid],
                                        zone_id=(
                                            "network"
                                            if any(
                                                k in eid
                                                for k in [
                                                    "speedtest",
                                                    "ping",
                                                    "net",
                                                    "traffic",
                                                    "icmp",
                                                    "virtualmachine",
                                                    "server",
                                                ]
                                            )
                                            else "overview"
                                        ),
                                        x=0,
                                        y=0,
                                        w=2,
                                        h=2,
                                    )
                                )
                                existing_card_ids.add(card_id)
                                has_changed = True

                        if has_changed or len(ent_map) != len(fresh_config.entities):
                            fresh_config.entities = list(ent_map.values())
                            fresh_config.cards = cards
                            await repo.save_config(fresh_config)

                            global _first_sync_reported
                            if not _first_sync_reported:
                                _first_sync_reported = True
                                sett = varco_provider.settings or {}
                                pk = sett.get("privateKey") or sett.get("private_key")
                                auth_id = sett.get("authorityId") or sett.get(
                                    "authority_id"
                                )
                                sc = sett.get("shareCode") or sett.get("share_code")
                                credentials_ready = bool(pk and auth_id and sc)

                                status_str = "YES" if credentials_ready else "PENDING"
                                pk_str = "OK" if pk else "Missing"
                                auth_str = "OK" if auth_id else "Missing"
                                msg = (
                                    f"Varco First Successful Sync Verified! Synced {len(collected)} entities. "
                                    f"Credentials persisted for future background sync: {status_str} "
                                    f"(privateKey: {pk_str}, authorityId: {auth_str})"
                                )
                                add_system_log(
                                    "INFO",
                                    msg,
                                    {
                                        "count": len(collected),
                                        "credentials_ready": credentials_ready,
                                        "has_private_key": bool(pk),
                                        "has_authority_id": bool(auth_id),
                                        "has_share_code": bool(sc),
                                    },
                                )

                            add_system_log(
                                "INFO",
                                f"Varco Collector synced {len(collected)} entities to server config",
                                {
                                    "count": len(collected),
                                    "first_entity": collected[0] if collected else None,
                                },
                            )
                            logger.info(
                                "Varco Background Collector synced entities",
                                count=len(collected),
                            )

            # Determine interval (minimum 5s, maximum 86400s / 24h, default 60s)
            interval = 60
            if config.enabled:
                if varco_provider and varco_provider.polling_interval_seconds:
                    interval = varco_provider.polling_interval_seconds
                elif config.polling_interval_seconds:
                    interval = config.polling_interval_seconds

            interval = max(5, min(86400, interval))

            # Sleep in small ticks to respond quickly to shutdown
            for _ in range(interval):
                if _stop_event.is_set():
                    break
                await asyncio.sleep(1)

        except Exception as e:
            logger.warning("Error in Varco Background Collector loop", exc_info=e)
            await asyncio.sleep(15)

    logger.info("Varco Background Collector stopped")


def start_varco_collector() -> None:
    global _collector_task
    _stop_event.clear()
    if _collector_task is None or _collector_task.done():
        _collector_task = asyncio.create_task(_run_collector_loop())


async def stop_varco_collector() -> None:
    global _collector_task
    _stop_event.set()
    if _collector_task and not _collector_task.done():
        _collector_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await _collector_task
    _collector_task = None
