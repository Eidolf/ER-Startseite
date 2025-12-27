import json
import os
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Optional, Union

router = APIRouter()

CONFIG_FILE = "/app/data/config.json"

# Default Configs (Mirroring Frontend Defaults)
DEFAULT_BG = {
    "type": "image",
    "value": "gradient"
}

DEFAULT_LOGO_CONFIG = {
    "type": "default",
    "value": None
}

DEFAULT_ICON_CONFIG = {
    "showBorder": True,
    "borderStyle": "default",
    "borderColor": "#00f3ff",
    "borderGradientColors": ["#00f3ff", "#9d00ff"],
    "backgroundStyle": "glass",
    "backgroundColor": "#1a1a1a",
    "gradientColors": ["#3b82f6", "#9333ea"]
}

DEFAULT_LAYOUT_CONFIG = {
    "mode": "grid",
    "customOrder": [],
    "categories": []
}

class BackgroundConfig(BaseModel):
    type: str
    value: str

class LogoConfig(BaseModel):
    type: str  # 'default' | 'image'
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

class AppConfig(BaseModel):
    pageTitle: str = "ER-Startseite"
    bgConfig: BackgroundConfig = DEFAULT_BG
    logoConfig: LogoConfig = DEFAULT_LOGO_CONFIG
    iconConfig: IconConfig = DEFAULT_ICON_CONFIG
    layoutConfig: LayoutConfig = DEFAULT_LAYOUT_CONFIG

def read_config() -> dict:
    if not os.path.exists(CONFIG_FILE):
        return {
            "pageTitle": "ER-Startseite",
            "bgConfig": DEFAULT_BG,
            "logoConfig": DEFAULT_LOGO_CONFIG,
            "iconConfig": DEFAULT_ICON_CONFIG,
            "layoutConfig": DEFAULT_LAYOUT_CONFIG
        }
    try:
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    except Exception:
         return {
            "pageTitle": "ER-Startseite",
            "bgConfig": DEFAULT_BG,
            "logoConfig": DEFAULT_LOGO_CONFIG,
            "iconConfig": DEFAULT_ICON_CONFIG,
            "layoutConfig": DEFAULT_LAYOUT_CONFIG
        }

def write_config(config: dict):
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

@router.get("", response_model=AppConfig)
async def get_config():
    """Get current application configuration."""
    return read_config()

@router.post("", response_model=AppConfig)
async def update_config(config: AppConfig):
    """Update application configuration."""
    write_config(config.dict())
    return config
