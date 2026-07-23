import os

from anyio import Path

from app.core.config import settings
from app.repositories.base import JsonRepository
from app.schemas.app import App
from app.schemas.config import (
    AppConfig,
    BackgroundConfig,
    IconConfig,
    LayoutConfig,
    LogoConfig,
)


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
