from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel
from app.core import security

router = APIRouter()

class SetupRequest(BaseModel):
    password: str

class LoginRequest(BaseModel):
    password: str

class AuthStatus(BaseModel):
    is_setup: bool
    is_authenticated: bool = False # Optional, for session check if we implement cookies later

@router.get("/status", response_model=AuthStatus)
async def get_status():
    return {"is_setup": security.is_setup()}

@router.post("/setup")
async def setup_auth(req: SetupRequest):
    if security.is_setup():
        raise HTTPException(status_code=400, detail="Already setup")
    security.setup_password(req.password)
    return {"status": "success"}

@router.post("/login")
async def login(req: LoginRequest, response: Response):
    if not security.check_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    # Simple session simulation (In a real app, sign a JWT)
    # For now, just return success. Frontend will gate. 
    # If we want backend gating, we'd set a cookie here.
    return {"status": "success", "token": "session-valid"} 

@router.post("/verify")
async def verify(req: LoginRequest):
    """Check password without setting session (for lock screen unlock)"""
    if not security.check_password(req.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    return {"status": "valid"}
