from typing import Optional
from pydantic import BaseModel, HttpUrl

class AppBase(BaseModel):
    name: str
    url: HttpUrl
    icon_url: Optional[str] = None
    premium_id: Optional[str] = None

class AppCreate(AppBase):
    pass

class App(AppBase):
    id: str
    created_at: str
