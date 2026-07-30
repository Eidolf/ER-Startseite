from typing import Any, Literal

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core import security
from app.services.log_service import (
    clear_system_logs,
    get_system_log_level,
    get_system_logs,
    set_system_log_level,
)

router = APIRouter()


def verify_admin_auth(access_token: str | None = Cookie(None)) -> None:
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    payload = security.verify_token(access_token)
    if not payload or payload.get("sub") != "admin":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )


class LogLevelPayload(BaseModel):
    level: str


@router.get("/logs")
async def get_logs(
    min_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Query(
        "DEBUG", description="Minimum log level"
    ),
    limit: int = Query(100, ge=1, le=500, description="Max entries to return"),
    _: None = Depends(verify_admin_auth),
) -> dict[str, Any]:
    logs = get_system_logs(min_level=min_level, limit=limit)
    return {
        "active_level": get_system_log_level(),
        "total": len(logs),
        "logs": logs,
    }


@router.delete("/logs")
async def clear_logs(_: None = Depends(verify_admin_auth)) -> dict[str, Any]:
    clear_system_logs()
    return {"status": "ok", "message": "Logs cleared"}


@router.post("/logs/level")
async def update_log_level(
    payload: LogLevelPayload, _: None = Depends(verify_admin_auth)
) -> dict[str, Any]:
    applied = set_system_log_level(payload.level)
    if not applied:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid log level: {payload.level}",
        )
    return {"status": "ok", "active_level": get_system_log_level()}
