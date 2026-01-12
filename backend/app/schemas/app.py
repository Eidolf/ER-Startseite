from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, HttpUrl


class AppBase(BaseModel):
    name: str
    id: Optional[str] = None
    url: Optional[HttpUrl] = None
    icon_url: Optional[str] = None
    custom_icon_url: Optional[str] = None
    description: Optional[str] = None
    premium_id: Optional[str] = None
    type: Literal["link", "folder"] = "link"
    contents: List["AppBase"] = []

    # Integration / Premium features
    integration: Optional[str] = None  # e.g. "ombi"
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    api_protected: bool = False
    api_config: Optional[Dict[str, Any]] = None  # Flexible config for specific features


class AppCreate(AppBase):
    pass


class App(AppBase):
    id: str
    created_at: str
    contents: List["App"] = []  # type: ignore


class AppPreviewRequest(BaseModel):
    url: HttpUrl


class AppPreviewResponse(BaseModel):
    title: Optional[str] = None
    icon: Optional[str] = None
    description: Optional[str] = None


App.model_rebuild()
