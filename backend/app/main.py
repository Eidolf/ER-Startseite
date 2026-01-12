from contextlib import asynccontextmanager

import structlog
import tomllib
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import BackendException

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Startup: Initializing ER-Startseite Backend")
    yield
    logger.info("Shutdown: cleaning up resources")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)


@app.exception_handler(BackendException)
async def backend_exception_handler(request: Request, exc: BackendException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error_code": exc.code, "message": exc.message},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Global Exception", error=str(exc))
    import traceback

    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_ERROR",
            "message": f"Internal Server Error: {str(exc)}",
        },
    )


# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=".*",  # Allow all origins for local/network testing
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")



def get_project_version():
    try:
        with open("pyproject.toml", "rb") as f:
            data = tomllib.load(f)
            return data["tool"]["poetry"]["version"]
    except Exception:
        return "0.0.0"

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "ER-Startseite Backend",
        "version": get_project_version()
    }


@app.get("/ready")
async def readiness_check():
    # TODO: Add DB check here
    return {"status": "ready"}
