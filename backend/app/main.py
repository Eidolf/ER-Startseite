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
from app.services.config_service import ConfigService

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
        "version": get_project_version(),
    }


@app.get("/ready")
async def readiness_check():
    # TODO: Add DB check here
    return {"status": "ready"}
@app.get("/manifest.webmanifest")
async def get_manifest():
    config_service = ConfigService()
    config = await config_service.get_config()

    # Default Name
    name = (config.pageTitle or "").strip() or "ER-Startseite"
    short_name = (name[:12] + "...") if len(name) > 12 else name

    # Default Icons
    icons = [
        {
            "src": "/logo.svg",
            "sizes": "any",
            "type": "image/svg+xml"
        }
    ]

    # If Custom Logo is set
    if config.logoConfig and config.logoConfig.value:
        logo_value = config.logoConfig.value
        is_valid_logo = False

        # Imports for validation
        import mimetypes
        from pathlib import Path

        logger.info(f"Manifest: Checking custom logo '{logo_value}'")

        # Check if local file exists
        if logo_value.startswith("/uploads/"):
            # Trust the configuration to avoid Docker volume path issues
            # If the user uploaded it, it's likely there.
            is_valid_logo = True

            # Debugging path (optional, kept for logs)
            # relative_path = logo_value.replace("/uploads/", "", 1)
            # file_path = Path(settings.UPLOAD_DIR) / relative_path
            # logger.info(f"Manifest: Path resolution: {file_path.absolute()}")

        # Allow external URLs (basic check)
        elif logo_value.startswith("http://") or logo_value.startswith("https://"):
            is_valid_logo = True
        # Allow relative paths (e.g. static assets)
        elif logo_value.startswith("/"):
             is_valid_logo = True

        logger.info(f"Manifest: Logo '{logo_value}' valid? {is_valid_logo}")

        if is_valid_logo:
             # Guess MIME type
            mime_type, _ = mimetypes.guess_type(logo_value)
            if not mime_type:
                # Fallback based on extension
                lower_val = logo_value.lower()
                if lower_val.endswith(".svg"):
                    mime_type = "image/svg+xml"
                elif lower_val.endswith(".png"):
                    mime_type = "image/png"
                elif lower_val.endswith(".jpg") or lower_val.endswith(".jpeg"):
                    mime_type = "image/jpeg"
                elif lower_val.endswith(".webp"):
                     mime_type = "image/webp"
                else:
                    mime_type = "image/png" # Default fallback

            custom_icon = {
                "src": logo_value,
                "sizes": "any",
                "type": mime_type
            }
            # Add as primary icon
            icons.insert(0, custom_icon)

    return {
        "name": name,
        "short_name": short_name,
        "description": "ER Startseite App",
        "theme_color": "#ffffff",
        "background_color": "#ffffff",
        "display": "standalone",
        "scope": "/",
        "start_url": "/",
        "orientation": "portrait",
        "icons": icons
    }
