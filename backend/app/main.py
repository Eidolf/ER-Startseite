from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import structlog
from app.core.config import settings
from app.api.v1.router import api_router
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
        content={"success": False, "error_code": exc.code, "message": exc.message}
    )


# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ER-Startseite Backend"}

@app.get("/ready")
async def readiness_check():
    # TODO: Add DB check here
    return {"status": "ready"}
