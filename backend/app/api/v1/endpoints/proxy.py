from typing import Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class ProxyRequest(BaseModel):
    url: str
    method: str = "GET"
    headers: dict[str, str] | None = None
    body: Any = None
    timeout: int = 30


class ProxyResponse(BaseModel):
    status_code: int
    data: Any
    headers: dict[str, str] | None = None


@router.post("/", response_model=ProxyResponse)
async def proxy_request(request: ProxyRequest):
    """
    Proxy HTTP requests to internal services.
    Solves Mixed Content issues when HTTPS frontend needs to call HTTP APIs.
    """
    try:
        async with httpx.AsyncClient(timeout=request.timeout, verify=False) as client:
            response = await client.request(
                method=request.method,
                url=request.url,
                headers=request.headers,
                json=(
                    request.body
                    if request.body and request.method in ["POST", "PUT", "PATCH"]
                    else None
                ),
            )

            # Try to parse as JSON, fall back to text
            try:
                data = response.json()
            except Exception:
                data = response.text

            return ProxyResponse(
                status_code=response.status_code,
                data=data,
                headers=dict(response.headers) if response.headers else None,
            )

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504, detail="Request to target service timed out"
        ) from None
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=502, detail=f"Failed to connect to target service: {str(e)}"
        ) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}") from e
