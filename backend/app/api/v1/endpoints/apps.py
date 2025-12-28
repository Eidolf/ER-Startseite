from typing import List

from fastapi import APIRouter, Depends

from app.core.premium_apps import AppRegistry, PremiumAppDefinition
from app.schemas.app import App, AppCreate
from app.services.app_service import AppService

router = APIRouter()


# Dependency Injection (Simple for now)
def get_service():
    return AppService()


@router.get("", response_model=List[App])
async def list_apps(service: AppService = Depends(get_service)):
    return await service.get_all()


@router.get("/premium", response_model=List[PremiumAppDefinition])
async def list_premium_apps():
    return AppRegistry.get_all()


@router.post("", response_model=App)
async def create_app(app_in: AppCreate, service: AppService = Depends(get_service)):
    return await service.create(app_in)


@router.delete("/{app_id}")
async def delete_app(app_id: str, service: AppService = Depends(get_service)):
    await service.delete(app_id)
    return {"status": "success"}  # Could be empty 204
