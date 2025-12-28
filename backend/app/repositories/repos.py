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
        await self._repo.file_path.write_text(config.model_dump_json(indent=2), encoding="utf-8")

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
