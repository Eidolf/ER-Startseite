import json
import os
import uuid
import httpx
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, HttpUrl
from datetime import datetime

router = APIRouter()

DATA_FILE = "/app/data/apps.json"

# Models
class AppBase(BaseModel):
    name: str
    url: HttpUrl
    icon_url: Optional[str] = None

class AppCreate(AppBase):
    pass

class App(AppBase):
    id: str
    created_at: str

# Helper to read/write data
def read_apps() -> List[dict]:
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def write_apps(apps: List[dict]):
    # Ensure directory exists
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(apps, f, indent=2)

import re
from urllib.parse import urljoin, urlparse



async def validate_icon_url(client: httpx.AsyncClient, icon_url: str) -> bool:
    """Check if the URL returns a valid image content type."""
    try:
        head_resp = await client.head(icon_url)
        if head_resp.status_code == 200:
            ct = head_resp.headers.get("content-type", "").lower()
            if ct.startswith("image/"):
                return True
        
        # Fallback to GET if HEAD fails or returns ambiguous content
        get_resp = await client.get(icon_url)
        if get_resp.status_code == 200:
            ct = get_resp.headers.get("content-type", "").lower()
            if ct.startswith("image/"):
                return True
    except Exception:
        pass
    return False

async def fetch_best_icon(url: str) -> Optional[str]:
    """
    Attempt to find the best favicon for a given URL.
    1. Check HTML <link rel="icon"> tags.
    2. Check /favicon.ico.
    3. Return None if nothing found.
    """
    try:
        async with httpx.AsyncClient(verify=False, follow_redirects=True, timeout=5.0) as client:
            # 1. Fetch Page Content
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    html = response.text
                    # Search for icon links
                    # Matches: rel="icon", rel="shortcut icon", rel="apple-touch-icon"
                    icon_regex = r'<link[^>]*rel=["\'](?:shortcut\s+)?(?:apple-touch-)?icon["\'][^>]*href=["\']([^"\']+)["\']'
                    matches = re.findall(icon_regex, html, re.IGNORECASE)
                    
                    if matches:
                        href = matches[0]
                        candidate = urljoin(url, href)
                        if await validate_icon_url(client, candidate):
                            return candidate
            except Exception:
                pass # Continue to fallback

            # 2. Try default /favicon.ico
            parsed = urlparse(url)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            favicon_url = urljoin(base_url, "/favicon.ico")
            
            if await validate_icon_url(client, favicon_url):
                return favicon_url

    except Exception as e:
        print(f"Error fetching icon for {url}: {e}")
        return None
    
    return None

@router.get("", response_model=List[App])
async def list_apps():
    """List all apps."""
    return read_apps()

@router.post("", response_model=App)
async def create_app(app_in: AppCreate):
    """Create a new app."""
    apps = read_apps()
    
    # Auto-generate icon if missing
    icon_url = app_in.icon_url
    if not icon_url:
        icon_url = await fetch_best_icon(str(app_in.url))
    
    new_app = {
        "id": str(uuid.uuid4()),
        "name": app_in.name,
        "url": str(app_in.url),
        "icon_url": icon_url,
        "created_at": datetime.utcnow().isoformat()
    }
    
    apps.append(new_app)
    write_apps(apps)
    return new_app

@router.delete("/{app_id}")
async def delete_app(app_id: str):
    """Delete an app."""
    apps = read_apps()
    initial_len = len(apps)
    apps = [a for a in apps if a["id"] != app_id]
    
    if len(apps) == initial_len:
        raise HTTPException(status_code=404, detail="App not found")
        
    write_apps(apps)
    return {"status": "success", "message": "App deleted"}
