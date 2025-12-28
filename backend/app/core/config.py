from typing import Any, List, Union

from pydantic import validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ER-Startseite"
    API_V1_STR: str = "/api/v1"

    # CORS
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:13001",
    ]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "app"
    DATABASE_URI: str | None = None

    @validator("DATABASE_URI", pre=True)
    def assemble_db_connection(cls, v: str | None, values: dict[str, Any]) -> str:
        if isinstance(v, str):
            return v
        return str(
            f"postgresql+asyncpg://{values.get('POSTGRES_USER')}:{values.get('POSTGRES_PASSWORD')}@"
            f"{values.get('POSTGRES_SERVER')}/{values.get('POSTGRES_DB')}"
        )

    # Security
    SECRET_KEY: str = "changeme"
    UPLOAD_DIR: str = "uploads"

    model_config = SettingsConfigDict(
        case_sensitive=True, env_file=".env", extra="ignore"
    )


settings = Settings()
