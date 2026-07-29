from typing import Any

import structlog
from fastapi import APIRouter, Header, Query, Request

from app.core.exceptions import AuthException
from app.repositories.repos import AppRepository, ConfigRepository
from app.schemas.config import WidgetDefaults

logger = structlog.get_logger()

router = APIRouter()


async def _get_valid_secrets() -> set[str]:
    """Collect all valid vacation secrets from config defaults and apps."""
    config_repo = ConfigRepository()
    config = await config_repo.get_config()

    app_repo = AppRepository()
    apps = await app_repo.read_all()

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

    return valid_secrets


def _extract_provided_secret(
    secret_token: str | None,
    secret: str | None,
    x_webhook_secret: str | None,
    authorization: str | None,
) -> str | None:
    if secret_token:
        return secret_token
    if secret:
        return secret
    if x_webhook_secret:
        return x_webhook_secret
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return None


@router.get("/vacation")
@router.get("/vacation/{secret_token}")
@router.head("/vacation")
@router.head("/vacation/{secret_token}")
async def verify_vacation_webhook(
    secret_token: str | None = None,
    secret: str | None = Query(None),
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
    authorization: str | None = Header(None, alias="Authorization"),
) -> dict[str, str]:
    valid_secrets = await _get_valid_secrets()
    provided_secret = _extract_provided_secret(
        secret_token, secret, x_webhook_secret, authorization
    )

    if not provided_secret or provided_secret not in valid_secrets:
        raise AuthException("Invalid or missing webhook secret token")

    return {
        "status": "success",
        "message": "Vacation webhook endpoint is active and verified",
    }


@router.post("/vacation")
@router.post("/vacation/{secret_token}")
async def receive_vacation_webhook(
    request: Request,
    secret_token: str | None = None,
    secret: str | None = Query(None),
    x_webhook_secret: str | None = Header(None, alias="X-Webhook-Secret"),
    authorization: str | None = Header(None, alias="Authorization"),
) -> dict[str, str]:
    valid_secrets = await _get_valid_secrets()
    provided_secret = _extract_provided_secret(
        secret_token, secret, x_webhook_secret, authorization
    )

    if not provided_secret or provided_secret not in valid_secrets:
        logger.warning("Unauthorized vacation webhook attempt", provided="***")
        raise AuthException("Invalid or missing webhook secret token")

    # Safely parse body payload
    try:
        payload: dict[str, Any] = await request.json()
    except Exception:
        payload = {}

    # Check for ping/test events
    event_type = str(
        payload.get("event") or payload.get("type") or payload.get("action") or ""
    ).lower()

    if event_type in ("ping", "test", "verification") or not payload:
        logger.info("Vacation webhook ping/verification received successfully")
        return {
            "status": "success",
            "message": "Webhook ping received successfully",
        }

    # Extract trip info from nested structures
    trip_data = payload
    for key in ("data", "trip", "vacation", "attributes", "payload"):
        if isinstance(payload.get(key), dict):
            trip_data = payload[key]
            break

    title = (
        trip_data.get("name")
        or trip_data.get("title")
        or trip_data.get("trip_name")
        or trip_data.get("destination")
        or trip_data.get("summary")
        or trip_data.get("text")
        or "Nächster Urlaub"
    )
    target_date = (
        trip_data.get("startDate")
        or trip_data.get("date")
        or trip_data.get("targetDate")
        or trip_data.get("start_date")
        or trip_data.get("start")
        or trip_data.get("departure")
        or trip_data.get("departureDate")
        or trip_data.get("timestamp")
    )
    destination = (
        trip_data.get("destination")
        or trip_data.get("location")
        or trip_data.get("city")
        or trip_data.get("place")
    )

    if not target_date:
        # If payload seems to be a test/ping without date fields, respond gracefully
        logger.info(
            "Received vacation webhook without explicit target_date", payload=payload
        )
        return {
            "status": "success",
            "message": "Webhook payload received (no target_date updated)",
        }

    config_repo = ConfigRepository()
    config = await config_repo.get_config()

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
