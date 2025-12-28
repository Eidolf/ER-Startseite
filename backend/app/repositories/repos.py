from app.repositories.base import JsonRepository
from app.schemas.app import App
from app.schemas.config import AppConfig

# App Repo manages a LIST of Apps
class AppRepository(JsonRepository[App]):
    def __init__(self):
        super().__init__("/app/data/apps.json", App)

# Config Repo manages a SINGLE Config Object (stored as a JSON object, not list)
# We need to override read/save for single object
class ConfigRepository:
    def __init__(self):
        self._repo = JsonRepository("/app/data/config.json", AppConfig) 
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
        await self._repo.file_path.write_text(config.json(indent=2), encoding="utf-8")

    def _get_default(self) -> AppConfig:
        from app.core.constants import DEFAULT_BG, DEFAULT_ICON_CONFIG, DEFAULT_LAYOUT_CONFIG, DEFAULT_LOGO_CONFIG
        return AppConfig(
            bgConfig=DEFAULT_BG,
            logoConfig=DEFAULT_LOGO_CONFIG,
            iconConfig=DEFAULT_ICON_CONFIG,
            layoutConfig=DEFAULT_LAYOUT_CONFIG
        )
