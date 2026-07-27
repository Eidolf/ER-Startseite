from typing import Any

import structlog
from fastapi import APIRouter, Header, Query

from app.core.exceptions import AuthException, ValidationException
from app.repositories.repos import AppRepository, ConfigRepository
from app.schemas.config import WidgetDefaults

logger = structlog.get_logger()

router = APIRouter()


@router.post("/vacation")
async def receive_vacation_webhook(
    payload: dict[str, Any],
    secret: str | None = Query(None),
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
) -> dict[str, str]:
    config_repo = ConfigRepository()
    config = await config_repo.get_config()

    app_repo = AppRepository()
    apps = await app_repo.read_all()

    # Collect all active secrets from TREK app configurations and widgetDefaults
    valid_secrets = set()
    if (
        config.layoutConfig.widgetDefaults
        and config.layoutConfig.widgetDefaults.vacationSecret
    ):
        valid_secrets.add(config.layoutConfig.widgetDefaults.vacationSecret)

    for app in apps:
        if app.api_config and isinstance(app.api_config, dict):
            sec = app.api_config.get("vacationSecret")
            enabled = app.api_config.get("webhookEnabled", True)
            if sec and enabled:
                valid_secrets.add(str(sec))

    provided_secret = secret or x_webhook_secret

    if not provided_secret or provided_secret not in valid_secrets:
        logger.warning("Unauthorized vacation webhook attempt", provided="***")
        raise AuthException("Invalid or missing webhook secret token")

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
        raise ValidationException("Missing startDate / date in payload")

    # Update widgetDefaults in config securely
    if not config.layoutConfig.widgetDefaults:
        config.layoutConfig.widgetDefaults = WidgetDefaults()

    config.layoutConfig.widgetDefaults.vacationTitle = str(title)
    config.layoutConfig.widgetDefaults.vacationDate = str(target_date)
    if destination:
        config.layoutConfig.widgetDefaults.vacationDestination = str(destination)

    await config_repo.save_config(config)

    logger.info("Vacation webhook updated successfully", title=title, date=target_date)

    return {
        "status": "success",
        "message": "Vacation payload updated successfully",
    }
