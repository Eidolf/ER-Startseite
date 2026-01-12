from typing import Any, Literal

from pydantic import BaseModel, HttpUrl


class AppBase(BaseModel):
    name: str
    id: str | None = None
    url: HttpUrl | None = None
    icon_url: str | None = None
    custom_icon_url: str | None = None
    description: str | None = None
    premium_id: str | None = None
    type: Literal["link", "folder"] = "link"
    contents: list["AppBase"] = []

    # Integration / Premium features
    integration: str | None = None  # e.g. "ombi"
    api_key: str | None = None
    api_url: str | None = None
    api_protected: bool = False
    api_config: dict[str, Any] | None = None  # Flexible config for specific features


class AppCreate(AppBase):
    pass


class App(AppBase):
    id: str
    created_at: str
    contents: list["App"] = []  # type: ignore


class AppPreviewRequest(BaseModel):
    url: HttpUrl


class AppPreviewResponse(BaseModel):
    title: str | None = None
    icon: str | None = None
    description: str | None = None


App.model_rebuild()
