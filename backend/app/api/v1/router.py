from fastapi import APIRouter
from app.api.v1.endpoints import users, apps

api_router = APIRouter()

# api_router.include_router(users.router, prefix="/users", tags=["users"])
# api_router.include_router(apps.router, prefix="/apps", tags=["apps"])
