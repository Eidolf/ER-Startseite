from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import structlog
from app.core.config import settings
from app.api.v1.router import api_router

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
