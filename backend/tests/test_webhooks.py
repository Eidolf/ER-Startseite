import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.repositories.repos import ConfigRepository
from app.schemas.config import AppConfig, LayoutConfig, WidgetDefaults


@pytest.mark.asyncio
async def test_vacation_webhook_get_and_post_verification(monkeypatch):
    mock_config = AppConfig(
        bgConfig={"type": "color", "value": "#000"},
        logoConfig={"type": "text"},
        iconConfig={
            "showBorder": False,
            "borderStyle": "solid",
            "borderColor": "#fff",
            "borderGradientColors": [],
            "backgroundStyle": "flat",
            "backgroundColor": "#000",
            "gradientColors": [],
        },
        layoutConfig=LayoutConfig(
            widgetDefaults=WidgetDefaults(vacationSecret="test_secret_123")
        ),
    )

    async def mock_get_config(self):
        return mock_config

    monkeypatch.setattr(ConfigRepository, "get_config", mock_get_config)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/v1/webhooks/vacation?secret=test_secret_123")
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

        resp_path = await ac.get("/api/v1/webhooks/vacation/test_secret_123")
        assert resp_path.status_code == 200
        assert resp_path.json()["status"] == "success"

        resp_ping = await ac.post(
            "/api/v1/webhooks/vacation/test_secret_123", json={"event": "ping"}
        )
        assert resp_ping.status_code == 200
        assert resp_ping.json()["status"] == "success"

        resp_bad = await ac.post(
            "/api/v1/webhooks/vacation?secret=wrong_secret", json={}
        )
        assert resp_bad.status_code == 401
