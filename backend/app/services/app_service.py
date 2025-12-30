import re
import uuid
from datetime import datetime
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import httpx

from app.core.exceptions import NotFoundException
from app.core.premium_apps import AppRegistry
from app.repositories.repos import AppRepository
from app.schemas.app import App, AppCreate


class AppService:
    def __init__(self):
        self.repo = AppRepository()

    async def get_all(self) -> List[App]:
        return await self.repo.read_all()

    async def create(self, app_in: AppCreate) -> App:
        # 1. Determine Icon Logic
        icon_url = app_in.icon_url
        
        # Only fetch icon if it's a link and has a URL
        if app_in.type == 'link' and app_in.url and not icon_url:
            # Check premium default
            if app_in.premium_id:
                premium_app = AppRegistry.get(app_in.premium_id)
                if premium_app and premium_app.default_icon:
                    icon_url = premium_app.default_icon

            # Fallback to fetching
            if not icon_url:
                try:
                    print(f"Fetching icon for {app_in.url}", flush=True)
                    icon_url = await self._fetch_best_icon(str(app_in.url))
                    print(f"Fetched icon: {icon_url}", flush=True)
                except Exception as e:
                    print(f"Error fetching icon: {e}", flush=True)

        # 2. Create Instance
        new_app = App(
            id=str(uuid.uuid4()),
            name=app_in.name,
            url=app_in.url,
            icon_url=icon_url,
            premium_id=app_in.premium_id,
            type=app_in.type,
            contents=app_in.contents,
            created_at=datetime.utcnow().isoformat(),
        )

        # 3. Save
        print(f"Saving app {new_app.id} to DB", flush=True)
        await self.repo.add(new_app)
        return new_app

    async def delete(self, app_id: str):
        success = await self.repo.delete(app_id)
        if not success:
            raise NotFoundException(f"App {app_id}")

    async def update(self, app_id: str, app_in: dict) -> App:
        updated = await self.repo.update(app_id, app_in)
        if not updated:
            raise NotFoundException(f"App {app_id}")
        return updated

    # --- Helper Logic (Refactored from old endpoint) ---
    async def _fetch_best_icon(self, url: str) -> Optional[str]:
        try:
            async with httpx.AsyncClient(
                verify=False, follow_redirects=True, timeout=2.0
            ) as client:
                # 1. Fetch Page Content
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        html = response.text
                        icon_regex = (
                            r'<link[^>]*rel=["\'](?:shortcut\s+)?(?:apple-touch-)?'
                            r'icon["\'][^>]*href=["\']([^"\']+)["\']'
                        )
                        matches = re.findall(icon_regex, html, re.IGNORECASE)
                        if matches:
                            candidate = urljoin(url, matches[0])
                            if await self._validate_icon_url(client, candidate):
                                return candidate
                except Exception:
                    pass

                # 2. Try default /favicon.ico
                parsed = urlparse(url)
                base_url = f"{parsed.scheme}://{parsed.netloc}"
                favicon_url = urljoin(base_url, "/favicon.ico")
                if await self._validate_icon_url(client, favicon_url):
                    return favicon_url

        except Exception:
            return None
        return None

    async def _validate_icon_url(
        self, client: httpx.AsyncClient, icon_url: str
    ) -> bool:
        try:
            head_resp = await client.head(icon_url)
            if head_resp.status_code == 200 and head_resp.headers.get(
                "content-type", ""
            ).lower().startswith("image/"):
                return True
            get_resp = await client.get(icon_url)
            if get_resp.status_code == 200 and get_resp.headers.get(
                "content-type", ""
            ).lower().startswith("image/"):
                return True
        except Exception:
            pass
        return False
