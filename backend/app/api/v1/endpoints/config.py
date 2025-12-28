from fastapi import APIRouter, Depends

from app.schemas.config import AppConfig
from app.services.config_service import ConfigService

router = APIRouter()


def get_service():
    return ConfigService()


@router.get("", response_model=AppConfig)
async def get_config(service: ConfigService = Depends(get_service)):
    return await service.get_config()


@router.post("", response_model=AppConfig)
async def update_config(
    config: AppConfig, service: ConfigService = Depends(get_service)
):
    return await service.update_config(config)
