from typing import Any

import structlog
from fastapi import APIRouter, Header, HTTPException, Query, status

from app.repositories.repos import ConfigRepository

logger = structlog.get_logger()

router = APIRouter()


@router.post("/vacation")
async def receive_vacation_webhook(
    payload: dict[str, Any],
    secret: str | None = Query(None),
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
) -> dict[str, str]:
    repo = ConfigRepository()
    config = await repo.get_config()

    # Secret validation (configured in settings or widgetDefaults)
    expected_secret = (
        config.layoutConfig.widgetDefaults.vacationSecret
        if config.layoutConfig.widgetDefaults
        else None
    ) or "er-vacation-secret"

    provided_secret = secret or x_webhook_secret

    if not provided_secret or provided_secret != expected_secret:
        logger.warning(
            "Unauthorized vacation webhook attempt", provided=provided_secret
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing webhook secret token",
        )

    # Extract trip info from TREK payload, ntfy payload, or generic JSON
    trip_data = payload
    if isinstance(payload.get("data"), dict):
        trip_data = payload["data"]

    title = (
        trip_data.get("name")
        or trip_data.get("title")
        or trip_data.get("destination")
        or "Nächster Urlaub"
    )
    target_date = (
        trip_data.get("startDate")
        or trip_data.get("date")
        or trip_data.get("targetDate")
        or trip_data.get("start_date")
    )
    destination = (
        trip_data.get("destination")
        or trip_data.get("location")
        or trip_data.get("city")
    )

    if not target_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing startDate / date in payload",
        )

    # Update widgetDefaults in config securely
    if config.layoutConfig.widgetDefaults:
        config.layoutConfig.widgetDefaults.vacationTitle = str(title)
        config.layoutConfig.widgetDefaults.vacationDate = str(target_date)
        if destination:
            config.layoutConfig.widgetDefaults.vacationDestination = str(destination)
        await repo.save_config(config)

    logger.info("Vacation webhook updated successfully", title=title, date=target_date)

    return {
        "status": "success",
        "message": "Vacation payload updated successfully",
    }
