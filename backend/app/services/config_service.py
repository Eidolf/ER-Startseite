from app.schemas.config import AppConfig
from app.repositories.repos import ConfigRepository

class ConfigService:
    def __init__(self):
        self.repo = ConfigRepository()

    async def get_config(self) -> AppConfig:
        return await self.repo.get_config()

    async def update_config(self, config: AppConfig) -> AppConfig:
        await self.repo.save_config(config)
        return config
