from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel

from app.core.exceptions import AuthException
from app.services.auth_service import AuthService

router = APIRouter()


class SetupRequest(BaseModel):
    password: str


class LoginRequest(BaseModel):
    password: str


class AuthStatus(BaseModel):
    is_setup: bool
    is_authenticated: bool = False


def get_service():
    return AuthService()


@router.get("/status", response_model=AuthStatus)
async def get_status(service: AuthService = Depends(get_service)):
    return {"is_setup": service.is_setup()}


@router.post("/setup")
async def setup_auth(req: SetupRequest, service: AuthService = Depends(get_service)):
    service.setup_password(req.password)
    return {"status": "success"}


@router.post("/login")
async def login(
    req: LoginRequest, response: Response, service: AuthService = Depends(get_service)
):
    if not service.verify_password(req.password):
        raise AuthException("Invalid password")
    return {"status": "success", "token": "session-valid"}


@router.post("/verify")
async def verify(req: LoginRequest, service: AuthService = Depends(get_service)):
    if not service.verify_password(req.password):
        raise AuthException("Invalid password")
    return {"status": "valid"}


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest, service: AuthService = Depends(get_service)
):
    service.change_password(req.old_password, req.new_password)
    return {"status": "success"}
