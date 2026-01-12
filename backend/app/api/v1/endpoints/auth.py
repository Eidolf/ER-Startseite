from datetime import timedelta

from fastapi import APIRouter, Cookie, Depends, Response
from pydantic import BaseModel

from app.core import security
from app.core.exceptions import AuthException
from app.services.auth_service import AuthService

router = APIRouter()


class SetupRequest(BaseModel):
    password: str


class LoginRequest(BaseModel):
    password: str
    remember: bool = False  # New flag


class AuthStatus(BaseModel):
    is_setup: bool
    is_authenticated: bool = False


def get_service():
    return AuthService()


@router.get("/status", response_model=AuthStatus)
async def get_status(
    service: AuthService = Depends(get_service), access_token: str | None = Cookie(None)
):
    is_authenticated = False
    if access_token:
        payload = security.verify_token(access_token)
        if payload and payload.get("sub") == "admin":
            is_authenticated = True

    return {"is_setup": service.is_setup(), "is_authenticated": is_authenticated}


@router.post("/setup")
async def setup_auth(req: SetupRequest, service: AuthService = Depends(get_service)):
    service.setup_password(req.password)
    return {"status": "success"}


def set_auth_cookie(response: Response, remember: bool):
    access_token_expires = timedelta(days=30) if remember else timedelta(hours=12)
    access_token = security.create_access_token(
        data={"sub": "admin"}, expires_delta=access_token_expires
    )

    # 30 days or session
    max_age = 30 * 24 * 60 * 60 if remember else None

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,  # Set to True in Production (HTTPS)
        samesite="lax",
        max_age=max_age,
    )


@router.post("/login")
async def login(
    req: LoginRequest, response: Response, service: AuthService = Depends(get_service)
):
    if not service.verify_password(req.password):
        raise AuthException("Invalid password")

    set_auth_cookie(response, req.remember)
    return {"status": "success", "token": "cookie-set"}


@router.post("/verify")
async def verify(
    req: LoginRequest, response: Response, service: AuthService = Depends(get_service)
):
    if not service.verify_password(req.password):
        raise AuthException("Invalid password")

    set_auth_cookie(response, req.remember)
    return {"status": "valid"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"status": "success"}


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest, service: AuthService = Depends(get_service)
):
    service.change_password(req.old_password, req.new_password)
    return {"status": "success"}
