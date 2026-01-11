from fastapi import APIRouter, HTTPException, Query

from app.services.registry_service import RegistryService

router = APIRouter()
service = RegistryService()


@router.post("/validate")
async def validate_registry(url: str = Query(...)):
    """
    Validates a registry URL.
    """
    is_valid = await service.validate_registry_url(url)
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Invalid registry URL or format (must be a JSON list)",
        )
    return {"status": "success", "message": "Registry URL is valid"}
