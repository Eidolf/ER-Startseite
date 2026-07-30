import asyncio
import contextlib
import json
import re
import urllib.parse
from typing import Any

import httpx
import structlog

from app.repositories.repos import MonitoringRepository
from app.schemas.monitoring import MonitoringEntity

logger = structlog.get_logger()

_collector_task: asyncio.Task[None] | None = None
_stop_event: asyncio.Event = asyncio.Event()


async def _fetch_varco_data(url: str) -> list[dict[str, Any]]:
    """Fetches Varco share URL or endpoint and extracts entities."""
    clean_url = url.strip()
    if not clean_url:
        return []

    parsed = urllib.parse.urlparse(clean_url)
    if parsed.scheme not in ("http", "https"):
        return []

    extracted_entities: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        resp = await client.get(clean_url)
        if resp.status_code != 200:
            return []

        body_str = resp.text

        # 1. Try HTML section parsing (Varco live status page style)
        section_pattern = r'<section[^>]*data-entity="([^"]+)"[^>]*>(.*?)</section>'
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
                    val: Any = parts[0] if parts else raw_st
                    unit = parts[1] if len(parts) > 1 else None
                    with contextlib.suppress(ValueError):
                        val = float(val)
                    extracted_entities.append(
                        {
                            "id": ent_id,
                            "name": ent_id.split(".")[-1].replace("_", " ").title(),
                            "state": val,
                            "unit": unit,
                            "domain": (
                                "binary_sensor"
                                if ent_id.startswith("binary_sensor.")
                                else "sensor"
                            ),
                        }
                    )

        # 2. Try JSON payload parsing
        if not extracted_entities:
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
                                    elif isinstance(sub_v, (str, int, float, bool)):
                                        raw_items.append({"id": sub_k, "state": sub_v})
                elif isinstance(data, list):
                    raw_items = data

                for item in raw_items:
                    if isinstance(item, dict) and "id" in item:
                        st = item.get("state")
                        u = item.get("unit_of_measurement") or item.get("unit")
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
                                    if str(item["id"]).startswith("binary_sensor.")
                                    else "sensor"
                                ),
                            }
                        )
            except Exception:
                pass

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

                if varco_provider and varco_provider.url:
                    collected = await _fetch_varco_data(varco_provider.url)
                    if collected:
                        ent_map = {e.id: e for e in config.entities}
                        import datetime

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
                        logger.debug(
                            "Varco Background Collector synced entities",
                            count=len(collected),
                        )

            # Determine interval (minimum 5s, maximum 600s, default 15s)
            interval = 15
            if config.enabled:
                varco_p = next((p for p in config.providers if p.type == "varco"), None)
                if varco_p and varco_p.polling_interval_seconds:
                    interval = varco_p.polling_interval_seconds
                elif config.polling_interval_seconds:
                    interval = config.polling_interval_seconds

            interval = max(5, min(600, interval))

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
