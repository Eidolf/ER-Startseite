from typing import List, Optional

from pydantic import BaseModel


class BackgroundConfig(BaseModel):
    type: str
    value: str


class LogoConfig(BaseModel):
    type: str
    value: Optional[str] = None


class IconConfig(BaseModel):
    showBorder: bool
    borderStyle: str
    borderColor: str
    borderGradientColors: List[str]
    backgroundStyle: str
    backgroundColor: str
    gradientColors: List[str]


class Category(BaseModel):
    id: str
    name: str
    app_ids: List[str] = []


class LayoutConfig(BaseModel):
    mode: str = "grid"
    customOrder: List[str] = []
    categories: List[Category] = []
    hiddenAppIds: List[str] = []


class AppConfig(BaseModel):
    pageTitle: str = "ER-Startseite"
    openInNewTab: bool = False
    bgConfig: BackgroundConfig
    logoConfig: LogoConfig
    iconConfig: IconConfig
    layoutConfig: LayoutConfig
    registry_urls: List[str] = []
