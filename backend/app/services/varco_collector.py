import asyncio
import contextlib
import datetime
import json
import re
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
            hash_params = urllib.parse.parse_qs(url_obj.fragment)

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
        except Exception:
            pass

    if not bridge_url and url:
        try:
            p = urllib.parse.urlparse(url)
            bridge_url = f"{p.scheme}://{p.netloc}"
        except Exception:
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
            "has_url": bool(clean_url),
        },
    )

    # 1. Direct Varco Bridge HTTP/JSON endpoint query
    if bridge_url and authority_id and share_code:
        try:
            base_b_url = (
                bridge_url.replace("wss://", "https://")
                .replace("ws://", "http://")
                .rstrip("/")
            )
            api_endpoint = (
                f"{base_b_url}/api/v1/share/{authority_id}/{share_code}/states"
            )
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(api_endpoint)
                if resp.status_code == 200:
                    text_body = resp.text.strip()
                    if text_body.startswith("{") or text_body.startswith("["):
                        try:
                            data = resp.json()
                            add_system_log(
                                "DEBUG",
                                "Varco Bridge raw JSON data payload",
                                {
                                    "keys": (
                                        list(data.keys())
                                        if isinstance(data, dict)
                                        else []
                                    ),
                                    "sample": str(data)[:300],
                                },
                            )
                            states_dict: dict[str, Any] = {}
                            if isinstance(data, dict):
                                raw_states = data.get("states")
                                if isinstance(raw_states, dict):
                                    states_dict = raw_states
                                elif not raw_states:
                                    states_dict = data
                            for eid, ent_data in states_dict.items():
                                if ent_data:
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
                                    ) or eid.split(".")[-1].replace("_", " ").title()
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
                                                if str(eid).startswith("binary_sensor.")
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
                            "Varco Opaque Bridge response (WebSocket authentication required)",
                            {"body": text_body[:100]},
                        )
        except Exception as e:
            logger.debug("Varco Bridge API endpoint query info", error=str(e))

    # 2. Try HTML section parsing from share URL as fallback
    if not extracted_entities and clean_url:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                resp = await client.get(clean_url)
                if resp.status_code == 200:
                    body_str = resp.text
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
                            if st_match:
                                raw_st = st_match.group(1).strip()
                                parts = raw_st.split()
                                html_val: Any = parts[0] if parts else raw_st
                                unit = parts[1] if len(parts) > 1 else None
                                with contextlib.suppress(ValueError):
                                    html_val = float(html_val)
                                extracted_entities.append(
                                    {
                                        "id": ent_id,
                                        "name": ent_id.split(".")[-1]
                                        .replace("_", " ")
                                        .title(),
                                        "state": html_val,
                                        "unit": unit,
                                        "domain": (
                                            "binary_sensor"
                                            if ent_id.startswith("binary_sensor.")
                                            else "sensor"
                                        ),
                                    }
                                )
                    else:
                        try:
                            data = json.loads(body_str)
                            raw_items: list[Any] = []
                            if isinstance(data, dict):
                                m = (
                                    data.get("grant", {}).get("manifest")
                                    if isinstance(data.get("grant"), dict)
                                    else data.get("manifest") or data
                                )
                                if isinstance(m, dict):
                                    for k in [
                                        "read_entities",
                                        "subscriptions",
                                        "entities",
                                        "states",
                                        "data",
                                    ]:
                                        v = m.get(k)
                                        if isinstance(v, list):
                                            raw_items.extend(v)
                                        elif isinstance(v, dict):
                                            for sub_k, sub_v in v.items():
                                                if isinstance(sub_v, dict):
                                                    item = dict(sub_v)
                                                    item["id"] = sub_k
                                                    raw_items.append(item)
                                                elif isinstance(
                                                    sub_v, (str, int, float, bool)
                                                ):
                                                    raw_items.append(
                                                        {"id": sub_k, "state": sub_v}
                                                    )
                            elif isinstance(data, list):
                                raw_items = data

                            for item in raw_items:
                                if isinstance(item, dict) and "id" in item:
                                    st = item.get("state")
                                    u = item.get("unit_of_measurement") or item.get(
                                        "unit"
                                    )
                                    extracted_entities.append(
                                        {
                                            "id": str(item["id"]),
                                            "name": str(
                                                item.get("name")
                                                or item["id"]
                                                .split(".")[-1]
                                                .replace("_", " ")
                                                .title()
                                            ),
                                            "state": st if st is not None else "N/A",
                                            "unit": str(u) if u else None,
                                            "domain": (
                                                "binary_sensor"
                                                if str(item["id"]).startswith(
                                                    "binary_sensor."
                                                )
                                                else "sensor"
                                            ),
                                        }
                                    )
                        except Exception:
                            pass
        except Exception as e:
            logger.debug("Varco share URL fallback query info", error=str(e))

    return extracted_entities


async def _run_collector_loop():
    logger.info("Varco Background Collector started")
    repo = MonitoringRepository()

    while not _stop_event.is_set():
        try:
            config = await repo.get_config()

            if config.enabled:
                varco_provider = next(
                    (p for p in config.providers if p.type == "varco" and p.enabled),
                    None,
                )

                if varco_provider and (varco_provider.url or varco_provider.settings):
                    collected = await _fetch_varco_data(
                        varco_provider.url or "", varco_provider.settings or {}
                    )
                    if collected:
                        ent_map = {e.id: e for e in config.entities}
                        iso_now = datetime.datetime.now(
                            datetime.timezone.utc
                        ).isoformat()

                        for c in collected:
                            eid = c["id"]
                            existing = ent_map.get(eid)
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
                                state=c.get("state", "N/A"),
                                unit_of_measurement=c.get("unit")
                                or (existing.unit_of_measurement if existing else None),
                                last_updated=iso_now,
                            )

                        config.entities = list(ent_map.values())
                        await repo.save_config(config)
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

            # Determine interval (minimum 5s, maximum 86400s / 24h, default 15s)
            interval = 15
            if config.enabled:
                varco_p = next((p for p in config.providers if p.type == "varco"), None)
                if varco_p and varco_p.polling_interval_seconds:
                    interval = varco_p.polling_interval_seconds
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


def start_varco_collector():
    global _collector_task
    _stop_event.clear()
    if _collector_task is None or _collector_task.done():
        _collector_task = asyncio.create_task(_run_collector_loop())


def stop_varco_collector():
    global _collector_task
    _stop_event.set()
    if _collector_task and not _collector_task.done():
        _collector_task.cancel()
    _collector_task = None
