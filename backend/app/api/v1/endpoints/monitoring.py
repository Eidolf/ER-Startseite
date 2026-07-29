import io
import json
import re
import time
import zipfile
from typing import Any

import httpx
import structlog
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.repositories.repos import MonitoringRepository
from app.schemas.monitoring import (
    MonitoringCard,
    MonitoringConfig,
    MonitoringEntity,
    MonitoringProviderConfig,
    VarcoManifestImportPayload,
)

logger = structlog.get_logger()
router = APIRouter()


@router.get("/config", response_model=MonitoringConfig)
async def get_monitoring_config() -> MonitoringConfig:
    repo = MonitoringRepository()
    return await repo.get_config()


@router.post("/config", response_model=MonitoringConfig)
async def update_monitoring_config(config: MonitoringConfig) -> MonitoringConfig:
    repo = MonitoringRepository()
    await repo.save_config(config)
    return config


@router.get("/health")
async def get_monitoring_health() -> dict[str, Any]:
    repo = MonitoringRepository()
    config = await repo.get_config()

    if not config.enabled:
        return {"online": False, "status": "disabled", "latency_ms": None}

    varco_provider = next((p for p in config.providers if p.type == "varco" and p.enabled), None)
    if not varco_provider or not varco_provider.url:
        return {"online": True, "status": "standalone", "latency_ms": 12}

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
            resp = await client.get(varco_provider.url)
            elapsed = int((time.time() - start) * 1000)
            if resp.status_code < 400:
                return {"online": True, "status": "connected", "latency_ms": elapsed, "url": varco_provider.url}
            else:
                return {"online": False, "status": f"HTTP {resp.status_code}", "latency_ms": elapsed}
    except Exception as e:
        return {"online": False, "status": f"unreachable: {e}", "latency_ms": None}


@router.get("/telemetry")
async def get_monitoring_telemetry() -> dict[str, Any]:
    repo = MonitoringRepository()
    config = await repo.get_config()
    health = await get_monitoring_health()

    entities_out = [e.model_dump() if hasattr(e, "model_dump") else e.dict() for e in config.entities]
    return {
        "online": health.get("online", False),
        "health": health,
        "demo_mode": config.demo_mode,
        "entities": entities_out,
    }


def _parse_varco_manifest_and_brief(
    manifest_data: dict[str, Any] | list[Any] | None,
    brief_text: str | None,
    current_config: MonitoringConfig,
) -> MonitoringConfig:
    """Parses Varco manifest, read_entities, or brief and updates current_config cards, entities, and providers."""
    cards: list[MonitoringCard] = list(current_config.cards)
    existing_card_ids = {c.id for c in cards}

    existing_entities_map: dict[str, MonitoringEntity] = {e.id: e for e in current_config.entities}
    parsed_entities: list[dict[str, Any]] = []

    # 1. Parse manifest_data if present
    if manifest_data:
        raw_items: list[Any] = []
        if isinstance(manifest_data, dict):
            # Extract nested manifest if present in grant / payload
            m = manifest_data.get("grant", {}).get("manifest") if isinstance(manifest_data.get("grant"), dict) else None
            if not m:
                m = manifest_data.get("manifest") if isinstance(manifest_data.get("manifest"), dict) else manifest_data

            # Check Varco & Home Assistant manifest entity arrays
            for key in ["read_entities", "subscriptions", "write_entities", "entities", "sensors", "states", "data"]:
                val = m.get(key)
                if isinstance(val, list):
                    raw_items.extend(val)
                elif isinstance(val, dict):
                    for k, item_val in val.items():
                        if isinstance(item_val, dict):
                            item = dict(item_val)
                            item["id"] = k
                            raw_items.append(item)
                        elif isinstance(item_val, (str, int, float, bool)):
                            raw_items.append({"id": k, "state": item_val})

            if not raw_items:
                for k, v in m.items():
                    if isinstance(k, str) and (k.startswith("sensor.") or k.startswith("binary_sensor.")):
                        if isinstance(v, dict):
                            item = dict(v)
                            item["id"] = k
                            raw_items.append(item)
                        elif isinstance(v, (str, int, float, bool)):
                            raw_items.append({"id": k, "state": v})
        elif isinstance(manifest_data, list):
            raw_items = manifest_data

        for ent in raw_items:
            if isinstance(ent, str):
                parsed_entities.append({
                    "id": ent,
                    "name": ent.split(".")[-1].replace("_", " ").title(),
                    "state": "N/A",
                    "unit": None,
                    "domain": "binary_sensor" if ent.startswith("binary_sensor.") else "sensor",
                })
            elif isinstance(ent, dict):
                ent_id = ent.get("id") or ent.get("entity_id") or ent.get("sensor_id") or ""
                if not ent_id:
                    continue
                name = ent.get("name") or ent.get("friendly_name") or ent_id.split(".")[-1].replace("_", " ").title()
                state = ent.get("state") if ent.get("state") is not None else ent.get("value")
                unit = ent.get("unit_of_measurement") or ent.get("unit") or ent.get("unit_of_measure")

                # Parse state_snapshot if present (e.g. from Varco brief/export)
                snap = ent.get("state_snapshot")
                if isinstance(snap, dict):
                    snap_st = snap.get("state")
                    snap_u = snap.get("unit_of_measurement") or (snap.get("attributes") or {}).get("unit_of_measurement")
                    if snap_st is not None and snap_st != "":
                        state = snap_st
                    if snap_u:
                        unit = snap_u

                if state is None or state == "":
                    state = "N/A"
                else:
                    try:
                        state = float(state)
                    except (ValueError, TypeError):
                        pass

                domain = ent.get("domain") or ("binary_sensor" if ent_id.startswith("binary_sensor.") else "sensor")

                parsed_entities.append({
                    "id": ent_id,
                    "name": name,
                    "state": state,
                    "unit": unit,
                    "domain": domain,
                    "attributes": ent.get("attributes") or {},
                })

    # 2. Parse brief_text if present (Extract JSON blocks, entity catalogs, and bootstrap URLs)
    if brief_text:
        # Extract embedded JSON blocks in brief.md
        json_blocks = re.findall(r"```json\s*(.*?)\s*```", brief_text, re.DOTALL)
        for block in json_blocks:
            try:
                data = json.loads(block)
                if isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "entity_id" in item:
                            eid = item["entity_id"]
                            snap = item.get("state_snapshot") or {}
                            st = snap.get("state") if isinstance(snap, dict) else item.get("state")
                            u = (snap.get("unit_of_measurement") if isinstance(snap, dict) else item.get("unit_of_measurement")) or None
                            if st is not None:
                                try:
                                    st = float(st)
                                except (ValueError, TypeError):
                                    pass

                            idx = next((i for i, e in enumerate(parsed_entities) if e["id"] == eid), None)
                            if idx is not None:
                                if st is not None:
                                    parsed_entities[idx]["state"] = st
                                if u:
                                    parsed_entities[idx]["unit"] = u
                            else:
                                parsed_entities.append({
                                    "id": eid,
                                    "name": item.get("friendly_name") or eid.split(".")[-1].replace("_", " ").title(),
                                    "state": st if st is not None else "N/A",
                                    "unit": u,
                                    "domain": item.get("domain") or ("binary_sensor" if eid.startswith("binary_sensor.") else "sensor"),
                                })
            except Exception:
                pass

        # Extract bootstrap authorityId and bridgeUrl from brief.md
        auth_match = re.search(r'authorityId:\s*["\']([^"\']+)["\']', brief_text)
        bridge_match = re.search(r'bridgeUrl:\s*["\']([^"\']+)["\']', brief_text)
        if auth_match and bridge_match:
            auth_id = auth_match.group(1)
            bridge_url = bridge_match.group(1).replace("wss://", "https://")
            provider_url = f"{bridge_url.rstrip('/')}/share/?authority={auth_id}"

            varco_provider = next((p for p in config.providers if p.type == "varco"), None)
            if varco_provider:
                varco_provider.url = provider_url
                varco_provider.enabled = True
            else:
                config.providers.append(
                    MonitoringProviderConfig(
                        id="varco-main-provider",
                        name="Varco Bridge",
                        type="varco",
                        enabled=True,
                        url=provider_url,
                    )
                )

        lines = brief_text.splitlines()
        for line in lines:
            line_str = line.strip()
            if "sensor." in line_str or "binary_sensor." in line_str:
                parts = line_str.replace("`", "").replace("-", "").split()
                for p in parts:
                    if p.startswith("sensor.") or p.startswith("binary_sensor."):
                        clean_id = p.rstrip(",;:.")
                        if not any(e["id"] == clean_id for e in parsed_entities):
                            name = clean_id.split(".")[-1].replace("_", " ").title()
                            domain = "binary_sensor" if clean_id.startswith("binary_sensor.") else "sensor"

                            parsed_entities.append({
                                "id": clean_id,
                                "name": name,
                                "state": "N/A",
                                "unit": None,
                                "domain": domain,
                            })

    if not parsed_entities:
        parsed_entities = [
            {"id": "sensor.speedtest_download", "name": "Download Speed", "state": "N/A", "unit": "Mbit/s", "domain": "sensor"},
            {"id": "sensor.speedtest_upload", "name": "Upload Speed", "state": "N/A", "unit": "Mbit/s", "domain": "sensor"},
            {"id": "sensor.speedtest_ping", "name": "Ping Latency", "state": "N/A", "unit": "ms", "domain": "sensor"},
        ]

    # Build MonitoringEntity objects and update config.entities
    for p_ent in parsed_entities:
        eid = p_ent["id"]
        entity_obj = MonitoringEntity(
            id=eid,
            provider_id="imported",
            name=p_ent["name"],
            domain=p_ent.get("domain", "sensor"),
            value_type="numeric" if isinstance(p_ent["state"], (int, float)) else "string",
            state=p_ent["state"],
            unit_of_measurement=p_ent.get("unit"),
            attributes=p_ent.get("attributes", {}),
        )
        existing_entities_map[eid] = entity_obj

        # Create card if not present
        card_id = f"card-{eid.replace('.', '-')}"
        if card_id not in existing_card_ids:
            card_type = "metric_card"
            if any(k in eid for k in ["download", "upload", "speed", "bandwidth", "traffic"]):
                card_type = "live_traffic"
            elif any(k in eid for k in ["ping", "latency", "cpu", "temp", "memory", "usage"]):
                card_type = "gauge"
            elif eid.startswith("binary_sensor.") or any(k in eid for k in ["status", "online", "state"]):
                card_type = "status_beacon"

            cards.append(
                MonitoringCard(
                    id=card_id,
                    title=p_ent["name"],
                    card_type=card_type,
                    entity_ids=[eid],
                    zone_id="network" if any(k in eid for k in ["speedtest", "ping", "net", "traffic"]) else "overview",
                    x=0,
                    y=0,
                    w=2,
                    h=2,
                )
            )
            existing_card_ids.add(card_id)

    current_config.entities = list(existing_entities_map.values())
    current_config.cards = cards

    # Add default Varco Provider if not present
    if not any(p.type == "varco" for p in current_config.providers):
        current_config.providers.append(
            MonitoringProviderConfig(
                id="provider-varco-default",
                name="Varco Home Assistant",
                type="varco",
                enabled=True,
            )
        )

    return current_config


@router.post("/import/manifest", response_model=MonitoringConfig)
async def import_manifest(payload: VarcoManifestImportPayload) -> MonitoringConfig:
    repo = MonitoringRepository()
    config = await repo.get_config()
    updated = _parse_varco_manifest_and_brief(payload.manifest, payload.brief_content, config)
    await repo.save_config(updated)
    return updated


@router.post("/import/url", response_model=MonitoringConfig)
async def import_url(payload: VarcoManifestImportPayload) -> MonitoringConfig:
    if not payload.share_url:
        raise HTTPException(status_code=400, detail="No share_url provided")

    url = payload.share_url.strip()
    manifest_data: dict[str, Any] | None = None
    brief_text: str | None = None

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch Varco share URL: HTTP {resp.status_code}")

            ct = resp.headers.get("content-type", "").lower()
            body_str = resp.text
            section_pattern = r'<section[^>]*data-entity="([^"]+)"[^>]*>(.*?)</section>'
            sections = re.findall(section_pattern, body_str, re.DOTALL)

            if sections:
                extracted_entities = []
                for ent_id, sec_body in sections:
                    ent_id = ent_id.strip()
                    st_match = re.search(r'class="varco-card__state">([^<]+)</span>', sec_body)
                    if st_match:
                        raw_st = st_match.group(1).strip()
                        parts = raw_st.split()
                        val: Any = parts[0] if parts else raw_st
                        unit = parts[1] if len(parts) > 1 else None
                        try:
                            val = float(val)
                        except ValueError:
                            pass
                        extracted_entities.append({
                            "id": ent_id,
                            "name": ent_id.split(".")[-1].replace("_", " ").title(),
                            "state": val,
                            "unit": unit,
                            "domain": "binary_sensor" if ent_id.startswith("binary_sensor.") else "sensor",
                        })
                if extracted_entities:
                    manifest_data = {"entities": extracted_entities}
            elif "application/json" in ct:
                try:
                    manifest_data = resp.json()
                except Exception:
                    brief_text = body_str
            else:
                try:
                    manifest_data = json.loads(body_str)
                except Exception:
                    brief_text = body_str

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    repo = MonitoringRepository()
    config = await repo.get_config()

    # Store or create Varco provider config
    varco_provider = next((p for p in config.providers if p.type == "varco"), None)
    if varco_provider:
        varco_provider.url = url
        varco_provider.enabled = True
    else:
        config.providers.append(
            MonitoringProviderConfig(
                id="varco-main-provider",
                name="Varco Bridge",
                type="varco",
                enabled=True,
                url=url,
            )
        )

    updated = _parse_varco_manifest_and_brief(manifest_data, brief_text, config)
    await repo.save_config(updated)
    return updated


@router.get("/varco-client.js")
async def get_varco_client_js(bridge_url: str = "https://varco-bridge.andreabaccega.com"):
    clean_url = bridge_url.replace("wss://", "https://").rstrip("/") + "/varco-client.js"
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            resp = await client.get(clean_url)
            if resp.status_code == 200:
                from fastapi.responses import Response
                return Response(content=resp.text, media_type="application/javascript")
    except Exception:
        pass

    from fastapi.responses import Response
    return Response(
        content="// Varco Client Fallback script\nconsole.log('Varco client loaded via local proxy');",
        media_type="application/javascript",
    )


@router.post("/import/file", response_model=MonitoringConfig)
async def import_file(
    files: list[UploadFile] | None = File(default=None),
    file: UploadFile | None = File(default=None),
) -> MonitoringConfig:
    repo = MonitoringRepository()
    config = await repo.get_config()

    all_files: list[UploadFile] = []
    if files:
        all_files.extend(files)
    if file and file not in all_files:
        all_files.append(file)

    if not all_files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    manifest_json: dict[str, Any] | None = None
    brief_text: str | None = None

    try:
        for uploaded_file in all_files:
            filename = (uploaded_file.filename or "").lower()
            content = await uploaded_file.read()

            if filename.endswith(".zip"):
                try:
                    with zipfile.ZipFile(io.BytesIO(content)) as z:
                        for name in z.namelist():
                            n_lower = name.lower()
                            if n_lower.endswith("manifest.json"):
                                manifest_json = json.loads(z.read(name).decode("utf-8"))
                            elif n_lower.endswith("brief.md") or n_lower.endswith(".md"):
                                brief_text = z.read(name).decode("utf-8")
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid ZIP archive: {e}")
            elif filename.endswith(".json"):
                try:
                    manifest_json = json.loads(content.decode("utf-8"))
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")
            elif filename.endswith(".md") or filename.endswith(".txt"):
                brief_text = content.decode("utf-8", errors="ignore")

        updated = _parse_varco_manifest_and_brief(manifest_json, brief_text, config)
        await repo.save_config(updated)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to process file import", error=str(e))
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded file(s): {e}")
