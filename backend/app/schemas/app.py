from typing import List, Literal, Optional

from pydantic import BaseModel, HttpUrl


class AppBase(BaseModel):
    name: str
    id: Optional[str] = None
    url: Optional[HttpUrl] = None
    icon_url: Optional[str] = None
    premium_id: Optional[str] = None
    type: Literal["link", "folder"] = "link"
    contents: List["AppBase"] = []


class AppCreate(AppBase):
    pass


class App(AppBase):
    id: str
    created_at: str


App.model_rebuild()
