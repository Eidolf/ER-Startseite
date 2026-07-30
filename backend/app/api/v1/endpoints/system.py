from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.log_service import (
    clear_system_logs,
    get_system_log_level,
    get_system_logs,
    set_system_log_level,
)

router = APIRouter()


class LogLevelPayload(BaseModel):
    level: str


@router.get("/logs")
async def get_logs(
    min_level: str = Query(
        "DEBUG", description="Minimum log level: DEBUG, INFO, WARNING, ERROR"
    ),
    limit: int = Query(100, ge=1, le=500, description="Max entries to return"),
) -> dict[str, Any]:
    logs = get_system_logs(min_level=min_level, limit=limit)
    return {
        "active_level": get_system_log_level(),
        "total": len(logs),
        "logs": logs,
    }


@router.delete("/logs")
async def clear_logs() -> dict[str, Any]:
    clear_system_logs()
    return {"status": "ok", "message": "Logs cleared"}


@router.post("/logs/level")
async def update_log_level(payload: LogLevelPayload) -> dict[str, Any]:
    set_system_log_level(payload.level)
    return {"status": "ok", "active_level": get_system_log_level()}
