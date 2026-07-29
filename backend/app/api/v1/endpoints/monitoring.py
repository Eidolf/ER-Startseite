import io
import json
import zipfile
from typing import Any

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


def _parse_varco_manifest_and_brief(
    manifest_data: dict[str, Any] | list[Any] | None,
    brief_text: str | None,
    current_config: MonitoringConfig,
) -> MonitoringConfig:
    """Parses Varco manifest or brief and updates current_config cards, entities, and providers."""
    cards: list[MonitoringCard] = list(current_config.cards)
    existing_card_ids = {c.id for c in cards}

    existing_entities_map: dict[str, MonitoringEntity] = {e.id: e for e in current_config.entities}
    parsed_entities: list[dict[str, Any]] = []

    # 1. Parse manifest_data if present
    if manifest_data:
        raw_items: list[Any] = []
        if isinstance(manifest_data, dict):
            if "entities" in manifest_data and isinstance(manifest_data["entities"], list):
                raw_items = manifest_data["entities"]
            elif "sensors" in manifest_data and isinstance(manifest_data["sensors"], list):
                raw_items = manifest_data["sensors"]
            elif "states" in manifest_data and isinstance(manifest_data["states"], list):
                raw_items = manifest_data["states"]
            elif "data" in manifest_data and isinstance(manifest_data["data"], list):
                raw_items = manifest_data["data"]
            else:
                # Key-value map format e.g. {"sensor.speed": {"state": 100, ...}}
                for k, v in manifest_data.items():
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
                if state is None or state == "":
                    state = "N/A"
                unit = ent.get("unit_of_measurement") or ent.get("unit") or ent.get("unit_of_measure")
                domain = "binary_sensor" if ent_id.startswith("binary_sensor.") else "sensor"

                parsed_entities.append({
                    "id": ent_id,
                    "name": name,
                    "state": state,
                    "unit": unit,
                    "domain": domain,
                    "attributes": ent.get("attributes") or {},
                })

    # 2. Parse brief.md if present
    if brief_text:
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


@router.post("/import/file", response_model=MonitoringConfig)
async def import_file(file: UploadFile = File(...)) -> MonitoringConfig:
    repo = MonitoringRepository()
    config = await repo.get_config()

    filename = (file.filename or "").lower()
    content = await file.read()

    manifest_json: dict[str, Any] | None = None
    brief_text: str | None = None

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
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload .json, .md, or .zip")

    updated = _parse_varco_manifest_and_brief(manifest_json, brief_text, config)
    await repo.save_config(updated)
    return updated
