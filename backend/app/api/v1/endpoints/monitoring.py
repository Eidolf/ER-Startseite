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
    manifest_data: dict[str, Any] | None,
    brief_text: str | None,
    current_config: MonitoringConfig,
) -> MonitoringConfig:
    """Parses Varco manifest or brief and updates current_config cards/providers."""
    cards: list[MonitoringCard] = list(current_config.cards)
    existing_ids = {c.id for c in cards}

    entities_to_add: list[dict[str, str]] = []

    # 1. Parse manifest.json if present
    if manifest_data:
        entities = manifest_data.get("entities") or manifest_data.get("sensors") or []
        for ent in entities:
            if isinstance(ent, str):
                entities_to_add.append({"id": ent, "name": ent.split(".")[-1].replace("_", " ").title()})
            elif isinstance(ent, dict):
                ent_id = ent.get("id") or ent.get("entity_id") or ""
                ent_name = ent.get("name") or ent_id.split(".")[-1].replace("_", " ").title()
                if ent_id:
                    entities_to_add.append({"id": ent_id, "name": ent_name})

    # 2. Parse brief.md if present
    if brief_text:
        lines = brief_text.splitlines()
        for line in lines:
            line_str = line.strip()
            if "sensor." in line_str or "binary_sensor." in line_str:
                # Extract sensor ID
                parts = line_str.replace("`", "").replace("-", "").split()
                for p in parts:
                    if p.startswith("sensor.") or p.startswith("binary_sensor."):
                        name = p.split(".")[-1].replace("_", " ").title()
                        entities_to_add.append({"id": p, "name": name})

    # Default fallback entities if none extracted
    if not entities_to_add:
        entities_to_add = [
            {"id": "sensor.speedtest_download", "name": "Download Speed"},
            {"id": "sensor.speedtest_upload", "name": "Upload Speed"},
            {"id": "sensor.speedtest_ping", "name": "Ping Latency"},
        ]

    # Create visualization cards
    for ent in entities_to_add:
        eid = ent["id"]
        name = ent["name"]
        card_id = f"card-{eid.replace('.', '-')}"

        if card_id in existing_ids:
            continue

        card_type = "metric_card"
        if "download" in eid or "upload" in eid or "speed" in eid or "bandwidth" in eid:
            card_type = "live_traffic"
        elif "ping" in eid or "latency" in eid or "cpu" in eid or "temp" in eid:
            card_type = "gauge"
        elif eid.startswith("binary_sensor."):
            card_type = "status_beacon"

        cards.append(
            MonitoringCard(
                id=card_id,
                title=name,
                card_type=card_type,
                entity_ids=[eid],
                zone_id="network" if "speedtest" in eid or "ping" in eid else "overview",
                x=0,
                y=0,
                w=2,
                h=2,
            )
        )
        existing_ids.add(card_id)

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
