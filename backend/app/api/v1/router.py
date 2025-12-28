from fastapi import APIRouter

from app.api.v1.endpoints import apps, auth, config, media

api_router = APIRouter()

# api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(apps.router, prefix="/apps", tags=["apps"])
api_router.include_router(media.router, prefix="/media", tags=["media"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
