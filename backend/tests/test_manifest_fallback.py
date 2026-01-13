from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.config import (
    AppConfig,
    BackgroundConfig,
    IconConfig,
    LayoutConfig,
    LogoConfig,
)

client = TestClient(app)


@pytest.fixture
def mock_config_service():
    with patch("app.main.ConfigService") as mock:
        yield mock


def test_manifest_default_fallback(mock_config_service):
    # Setup mock with empty title and no logo
    mock_instance = mock_config_service.return_value
    mock_instance.get_config = AsyncMock(
        return_value=AppConfig(
            pageTitle="   ",  # Empty with whitespace
            bgConfig=BackgroundConfig(type="color", value="#000"),
            logoConfig=LogoConfig(type="none", value=None),
            iconConfig=IconConfig(
                showBorder=False,
                borderStyle="",
                borderColor="",
                borderGradientColors=[],
                backgroundStyle="",
                backgroundColor="",
                gradientColors=[],
            ),
            layoutConfig=LayoutConfig(),
        )
    )

    response = client.get("/manifest.webmanifest")
    assert response.status_code == 200
    data = response.json()

    assert data["name"] == "ER-Startseite"
    assert len(data["icons"]) == 1
    assert data["icons"][0]["src"] == "/logo.svg"


def test_manifest_invalid_logo_file(mock_config_service):
    # Setup mock with invalid local logo
    mock_instance = mock_config_service.return_value
    mock_instance.get_config = AsyncMock(
        return_value=AppConfig(
            pageTitle="My App",
            bgConfig=BackgroundConfig(type="color", value="#000"),
            logoConfig=LogoConfig(type="image", value="/uploads/nonexistent.png"),
            iconConfig=IconConfig(
                showBorder=False,
                borderStyle="",
                borderColor="",
                borderGradientColors=[],
                backgroundStyle="",
                backgroundColor="",
                gradientColors=[],
            ),
            layoutConfig=LayoutConfig(),
        )
    )

    # We need to ensure the file check fails.
    # Since the code uses Path(settings.UPLOAD_DIR) / relative_path, and checks .exists()
    # We rely on the real filesystem. /uploads/nonexistent.png should not exist.

    response = client.get("/manifest.webmanifest")
    assert response.status_code == 200
    data = response.json()

    # Should only have default icon because fallback kicked in
    assert len(data["icons"]) == 1
    assert data["icons"][0]["src"] == "/logo.svg"


def test_manifest_valid_external_logo(mock_config_service):
    # Setup mock with external logo
    mock_instance = mock_config_service.return_value
    mock_instance.get_config = AsyncMock(
        return_value=AppConfig(
            pageTitle="My App",
            bgConfig=BackgroundConfig(type="color", value="#000"),
            logoConfig=LogoConfig(type="image", value="https://example.com/logo.png"),
            iconConfig=IconConfig(
                showBorder=False,
                borderStyle="",
                borderColor="",
                borderGradientColors=[],
                backgroundStyle="",
                backgroundColor="",
                gradientColors=[],
            ),
            layoutConfig=LayoutConfig(),
        )
    )

    response = client.get("/manifest.webmanifest")
    assert response.status_code == 200
    data = response.json()

    # Should have custom icon
    assert len(data["icons"]) == 2
    assert data["icons"][0]["src"] == "https://example.com/logo.png"
