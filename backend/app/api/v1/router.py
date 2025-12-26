from fastapi import APIRouter
from app.api.v1.endpoints import media, apps, config

api_router = APIRouter()

# api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(apps.router, prefix="/apps", tags=["apps"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
