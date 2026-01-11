from pydantic import BaseModel


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


class Category(BaseModel):
    id: str
    name: str
    app_ids: list[str] = []


class LayoutConfig(BaseModel):
    mode: str = "grid"
    customOrder: list[str] = []
    categories: list[Category] = []
    hiddenAppIds: list[str] = []


class AppConfig(BaseModel):
    pageTitle: str = "ER-Startseite"
    openInNewTab: bool = False
    bgConfig: BackgroundConfig
    logoConfig: LogoConfig
    iconConfig: IconConfig
    layoutConfig: LayoutConfig
    registry_urls: list[str] = []
