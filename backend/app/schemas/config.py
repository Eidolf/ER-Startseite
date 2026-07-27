from typing import Any

from pydantic import BaseModel, Field


class BackgroundConfig(BaseModel):
    type: str
    value: str


class LogoConfig(BaseModel):
    type: str
    value: str | None = None


class IconConfig(BaseModel):
    showBorder: bool
    borderStyle: str
    borderColor: str
    borderGradientColors: list[str]
    backgroundStyle: str
    backgroundColor: str
    gradientColors: list[str]
    backgroundOpacity: int = 10


class TitleConfig(BaseModel):
    style: str = "default"
    color: str = "#ffffff"
    gradientColors: list[str] = ["#00f3ff", "#9d00ff"]


class Category(BaseModel):
    id: str
    name: str
    app_ids: list[str] = []


class WidgetData(BaseModel):
    id: str
    type: str
    x: int = 0
    y: int = 0
    w: int = 1
    h: int = 1
    customText: str | None = None
    settings: dict[str, Any] = {}


class WidgetDefaults(BaseModel):
    weatherLocation: str | None = "Berlin"
    weatherUnit: str | None = "c"
    clockFormat: str | None = "24h"
    dateFormat: str | None = "DD.MM.YYYY"
    vacationTitle: str | None = "Countdown Event"
    vacationDate: str | None = None
    vacationApiUrl: str | None = None
    vacationApiKey: str | None = Field(default=None, exclude=True)
    vacationDestination: str | None = None
    vacationSecret: str | None = Field(default=None, exclude=True)


class LayoutConfig(BaseModel):
    mode: str = "grid"
    customOrder: list[str] = []
    categories: list[Category] = []
    hiddenAppIds: list[str] = []
    widgets: list[WidgetData] = []
    widgetDefaults: WidgetDefaults | None = None


class AppConfig(BaseModel):
    pageTitle: str = "ER-Startseite"
    openInNewTab: bool = False
    bgConfig: BackgroundConfig
    logoConfig: LogoConfig
    iconConfig: IconConfig
    titleConfig: TitleConfig = TitleConfig()
    layoutConfig: LayoutConfig
    registry_urls: list[str] = []
