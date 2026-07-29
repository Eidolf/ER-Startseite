import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_get_monitoring_config():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.get("/api/v1/monitoring/config")
        assert resp.status_code == 200
        data = resp.json()
        assert "zones" in data
        assert "cards" in data


@pytest.mark.asyncio
async def test_import_manifest_payload():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        payload = {
            "manifest": {
                "entities": [
                    "sensor.speedtest_download",
                    "sensor.speedtest_upload",
                    "sensor.speedtest_ping",
                ]
            },
            "brief_content": "Dashboard ER-Netz Status / Netzwerk\n- `sensor.speedtest_download`\n",
        }
        resp = await ac.post("/api/v1/monitoring/import/manifest", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert any(c["id"] == "card-sensor-speedtest_download" for c in data["cards"])
