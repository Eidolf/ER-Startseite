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
        super().__init__("data/apps.json", App)

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
# We need to override read/save for single object
class ConfigRepository:
    def __init__(self):
        self._repo = JsonRepository("data/config.json", AppConfig)
        # But JsonRepository assumes list...
        # Let's customize for Config

    async def get_config(self) -> AppConfig:
        if not await self._repo.file_path.exists():
            return self._get_default()
        try:
            content = await self._repo.file_path.read_text(encoding="utf-8")
            return AppConfig.parse_raw(content)
        except Exception:
            return self._get_default()

    async def save_config(self, config: AppConfig):
        await self._repo._ensure_dir()
        await self._repo.file_path.write_text(
            config.model_dump_json(indent=2), encoding="utf-8"
        )

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
