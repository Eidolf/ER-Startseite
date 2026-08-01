import asyncio
import contextlib
import datetime
import fcntl
import os
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

import structlog
from anyio import Path

from app.core.config import settings
from app.core.exceptions import LockTimeoutException
from app.repositories.base import JsonRepository
from app.schemas.app import App
from app.schemas.config import (
    AppConfig,
    BackgroundConfig,
    IconConfig,
    LayoutConfig,
    LogoConfig,
)

if TYPE_CHECKING:
    from app.schemas.monitoring import MonitoringConfig

logger = structlog.get_logger()


# App Repo manages a LIST of Apps
class AppRepository(JsonRepository[App]):
    def __init__(self):
        super().__init__(os.path.join(settings.DATA_DIR, "apps.json"), App)

    async def update(
        self, item_id: str, update_data: dict, id_field: str = "id"
    ) -> App | None:
        items = await self.read_all()
        updated_item = None

        # Recursive function to find and update
        def update_recursive(app_list):
            nonlocal updated_item
            for i, app in enumerate(app_list):
                if getattr(app, id_field) == item_id:
                    # Found it! Update logic similar to Base Repo
                    curr_data = app.model_dump(mode="json")
                    curr_data.update(update_data)
                    new_app = self.model(**curr_data)
                    app_list[i] = new_app
                    updated_item = new_app
                    return True

                # Check contents if folder
                if (
                    app.type == "folder"
                    and app.contents
                    and update_recursive(app.contents)
                ):
                    return True
            return False

        if update_recursive(items):
            await self.save_all(items)
            return updated_item

        return None


# Config Repo manages a SINGLE Config Object (stored as a JSON object, not list)
class ConfigRepository:
    def __init__(self):
        self._file_path = Path(os.path.join(settings.DATA_DIR, "config.json"))

    async def _ensure_dir(self):
        parent = self._file_path.parent
        if not await parent.exists():
            await parent.mkdir(parents=True, exist_ok=True)

    async def get_config(self) -> AppConfig:
        bak_path = Path(f"{self._file_path}.bak")

        # Try reading main file first
        if await self._file_path.exists():
            try:
                content = await self._file_path.read_text(encoding="utf-8")
                return AppConfig.parse_raw(content)
            except Exception as e:
                print(
                    f"WARNING: Failed reading {self._file_path}: {e}. Attempting backup restore...",
                    flush=True,
                )

        # Try reading backup file if primary failed or missing
        if await bak_path.exists():
            try:
                content = await bak_path.read_text(encoding="utf-8")
                config = AppConfig.parse_raw(content)
                print(
                    f"SUCCESS: Restored configuration from backup {bak_path}",
                    flush=True,
                )
                return config
            except Exception as e:
                print(f"ERROR: Backup restore from {bak_path} failed: {e}", flush=True)

        return self._get_default()

    async def save_config(self, config: AppConfig):
        await self._ensure_dir()
        content = config.model_dump_json(indent=2)

        tmp_path = Path(f"{self._file_path}.tmp")
        bak_path = Path(f"{self._file_path}.bak")

        await tmp_path.write_text(content, encoding="utf-8")

        if await self._file_path.exists():
            try:
                if await bak_path.exists():
                    await bak_path.unlink()
                await self._file_path.rename(bak_path)
            except Exception as e:
                print(f"WARNING: Failed creating config backup: {e}", flush=True)

        await tmp_path.rename(self._file_path)

    def _get_default(self) -> AppConfig:
        from app.core.constants import (
            DEFAULT_BG,
            DEFAULT_ICON_CONFIG,
            DEFAULT_LAYOUT_CONFIG,
            DEFAULT_LOGO_CONFIG,
        )

        return AppConfig(
            bgConfig=BackgroundConfig(**DEFAULT_BG),
            logoConfig=LogoConfig(**DEFAULT_LOGO_CONFIG),  # type: ignore[arg-type]
            iconConfig=IconConfig(**DEFAULT_ICON_CONFIG),  # type: ignore[arg-type]
            layoutConfig=LayoutConfig(**DEFAULT_LAYOUT_CONFIG),  # type: ignore[arg-type]
        )


class MonitoringRepository:
    _lock = asyncio.Lock()

    def __init__(self) -> None:
        self._file_path = Path(os.path.join(settings.DATA_DIR, "monitoring.json"))

    @property
    def lock(self) -> asyncio.Lock:
        return self._lock

    @contextlib.asynccontextmanager
    async def _acquire_file_lock(self) -> AsyncIterator[None]:
        lock_file = Path(os.path.join(settings.DATA_DIR, "monitoring.json.lock"))
        await lock_file.parent.mkdir(parents=True, exist_ok=True)
        acquired = False
        fd: int | None = None
        start_time = datetime.datetime.now(datetime.timezone.utc)

        try:
            fd = os.open(str(lock_file), os.O_RDWR | os.O_CREAT, 0o666)
            while not acquired:
                try:
                    fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    acquired = True
                except OSError as lock_err:
                    await asyncio.sleep(0.02)
                    if (
                        datetime.datetime.now(datetime.timezone.utc) - start_time
                    ).total_seconds() > 5.0:
                        logger.warning(
                            "MonitoringRepository file lock acquisition timed out",
                            exc_info=True,
                            error=str(lock_err),
                        )
                        break

            if acquired:
                yield
            else:
                raise LockTimeoutException(
                    "MonitoringRepository file lock acquisition timed out after 5.0s"
                )
        except Exception as err:
            if not isinstance(err, LockTimeoutException):
                logger.debug(
                    "MonitoringRepository file lock operation failed",
                    exc_info=True,
                    error=str(err),
                )
            raise
        finally:
            if fd is not None:
                if acquired:
                    try:
                        fcntl.flock(fd, fcntl.LOCK_UN)
                    except Exception as unlock_err:
                        logger.debug(
                            "Failed to release file lock",
                            exc_info=True,
                            error=str(unlock_err),
                        )
                try:
                    os.close(fd)
                except Exception as close_err:
                    logger.debug(
                        "Failed to close lock file descriptor",
                        exc_info=True,
                        error=str(close_err),
                    )

    async def _ensure_dir(self) -> None:
        parent = self._file_path.parent
        if not await parent.exists():
            await parent.mkdir(parents=True, exist_ok=True)

    async def get_config(self) -> "MonitoringConfig":
        from app.schemas.monitoring import MonitoringConfig

        await self._ensure_dir()

        try:
            async with self._acquire_file_lock():
                if await self._file_path.exists():
                    try:
                        content = await self._file_path.read_text(encoding="utf-8")
                        return MonitoringConfig.model_validate_json(content)
                    except Exception as err:
                        logger.debug(
                            "Failed to read/validate monitoring.json",
                            exc_info=True,
                            error=str(err),
                        )
        except LockTimeoutException as lock_err:
            logger.warning(
                "get_config lock acquisition timed out; returning default config",
                exc_info=True,
                error=str(lock_err),
            )

        return self._get_default()

    async def save_config(self, config: "MonitoringConfig") -> None:
        await self._ensure_dir()
        async with self._acquire_file_lock():
            content = config.model_dump_json(indent=2)
            await self._file_path.write_text(content, encoding="utf-8")

    def _get_default(self):
        from app.schemas.monitoring import (
            MonitoringCard,
            MonitoringConfig,
            MonitoringZone,
        )

        return MonitoringConfig(
            zones=[
                MonitoringZone(id="overview", name="Overview", icon="Activity"),
                MonitoringZone(id="network", name="Network Operations", icon="Wifi"),
                MonitoringZone(
                    id="infrastructure", name="Infrastructure", icon="Server"
                ),
                MonitoringZone(id="smarthome", name="Smart Home", icon="Home"),
                MonitoringZone(id="security", name="Security", icon="Shield"),
                MonitoringZone(id="custom", name="Custom", icon="Sliders"),
            ],
            cards=[
                MonitoringCard(
                    id="card-download",
                    title="Download Speed",
                    card_type="live_traffic",
                    entity_ids=["sensor.speedtest_download"],
                    zone_id="network",
                    x=0,
                    y=0,
                    w=2,
                    h=2,
                ),
                MonitoringCard(
                    id="card-upload",
                    title="Upload Speed",
                    card_type="live_traffic",
                    entity_ids=["sensor.speedtest_upload"],
                    zone_id="network",
                    x=2,
                    y=0,
                    w=2,
                    h=2,
                ),
                MonitoringCard(
                    id="card-ping",
                    title="Network Latency (Ping)",
                    card_type="gauge",
                    entity_ids=["sensor.speedtest_ping"],
                    zone_id="network",
                    x=4,
                    y=0,
                    w=2,
                    h=2,
                ),
            ],
            providers=[],
        )
