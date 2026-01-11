from typing import Any, Dict, List

from fastapi import APIRouter, Depends

from app.core.premium_apps import AppRegistry, PremiumAppDefinition
from app.schemas.app import App, AppCreate, AppPreviewRequest, AppPreviewResponse
from app.services.app_service import AppService

from app.services.config_service import ConfigService
from app.services.registry_service import RegistryService

router = APIRouter()
registry_service = RegistryService()
config_service = ConfigService()


# Dependency Injection (Simple for now)
def get_service():
    return AppService()


@router.get("", response_model=List[App])
async def list_apps(service: AppService = Depends(get_service)):
    return await service.get_all()


@router.get("/premium", response_model=List[PremiumAppDefinition])
async def list_premium_apps():
    config = await config_service.get_config()
    return await registry_service.get_all_premium_apps(config.registry_urls)



@router.post("", response_model=App)
async def create_app(app_in: AppCreate, service: AppService = Depends(get_service)):
    return await service.create(app_in)


@router.put("/{app_id}", response_model=App)
async def update_app(
    app_id: str, app_update: Dict[str, Any], service: AppService = Depends(get_service)
):
    return await service.update(app_id, app_update)


@router.delete("/{app_id}")
async def delete_app(app_id: str, service: AppService = Depends(get_service)):
    await service.delete(app_id)
    return {"status": "success"}


@router.post("/preview", response_model=AppPreviewResponse)
async def preview_app(
    preview_in: AppPreviewRequest, service: AppService = Depends(get_service)
):
    meta = await service.fetch_metadata(str(preview_in.url))
    return AppPreviewResponse(
        title=meta.get("title"),
        icon=meta.get("icon"),
        description=meta.get("description"),
    )
