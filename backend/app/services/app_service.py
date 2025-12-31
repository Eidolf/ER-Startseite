import re
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
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
        # 1. Determine Icon & Description Logic
        icon_url = app_in.icon_url
        custom_icon_url = app_in.custom_icon_url
        description = app_in.description

        # Metadata check (if needed)
        fetched_meta = {}
        should_fetch_meta = (
            app_in.type == "link"
            and app_in.url
            and (not icon_url or not description)
            and not custom_icon_url
        )

        if should_fetch_meta:
            try:
                print(f"Fetching metadata for {app_in.url}", flush=True)
                fetched_meta = await self.fetch_metadata(str(app_in.url))
                print(f"Fetched meta: {fetched_meta}", flush=True)
            except Exception as e:
                print(f"Error fetching metadata: {e}", flush=True)

        # ICON PRIORITY:
        # 1. Custom Icon (explicit upload)
        # 2. Premium Default (if selected)
        # 3. Fetched Icon (if valid link)
        # 4. Existing/Provided IconUrl (fallback)

        final_icon_url = icon_url  # Default to provided

        if custom_icon_url:
            final_icon_url = custom_icon_url
        elif app_in.premium_id:
            premium_app = AppRegistry.get(app_in.premium_id)
            if premium_app and premium_app.default_icon:
                final_icon_url = premium_app.default_icon
        elif not final_icon_url and fetched_meta.get("icon"):
            final_icon_url = fetched_meta["icon"]

        # DESCRIPTION PRIORITY:
        # 1. Provided Description
        # 2. Fetched Description
        if not description and fetched_meta.get("description"):
            description = fetched_meta["description"]

        # Helper to recursively create specific App instances from AppBase/AppCreate
        def ensure_app_instances(items: List[Any]) -> List[App]:
            apps = []
            for item in items:
                # Item is likely AppBase or dict.
                # If it's an object, dump it.
                data = item.model_dump() if hasattr(item, "model_dump") else dict(item)

                # Recursively process contents if any
                if "contents" in data and data["contents"]:
                    data["contents"] = ensure_app_instances(data["contents"])

                # Ensure ID and created_at
                if not data.get("id"):
                    data["id"] = str(uuid.uuid4())
                if not data.get("created_at"):
                    data["created_at"] = datetime.utcnow().isoformat()

                # If we are converting from AppBase to App, we might need to be careful
                # AppBase fields + id + created_at should satisfy App
                apps.append(App(**data))
            return apps

        processed_contents = (
            ensure_app_instances(app_in.contents) if app_in.contents else []
        )

        # 2. Create Instance
        new_app = App(
            id=str(uuid.uuid4()),
            name=app_in.name,
            url=app_in.url,
            icon_url=final_icon_url,
            custom_icon_url=custom_icon_url,
            description=description,
            premium_id=app_in.premium_id,
            type=app_in.type,
            contents=processed_contents,
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
        # Logic to handle custom_icon_url update if passed
        if "custom_icon_url" in app_in and app_in["custom_icon_url"]:
            app_in["icon_url"] = app_in["custom_icon_url"]

        updated = await self.repo.update(app_id, app_in)
        if not updated:
            raise NotFoundException(f"App {app_id}")
        return updated

    # --- Helper Logic ---
    async def fetch_metadata(self, url: str) -> dict:
        """
        Fetches metadata (icon, description) from the given URL.
        Returns a dict: {"icon": str | None, "description": str | None}
        """
        meta: Dict[str, Optional[str]] = {
            "icon": None,
            "description": None,
            "title": None,
        }
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.google.com/",
            }
            async with httpx.AsyncClient(
                verify=False, follow_redirects=True, timeout=15.0, headers=headers
            ) as client:
                # 1. Fetch Page Content
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        html = response.text

                        # A. Extract Title
                        title_regex = r"<title[^>]*>([^<]+)</title>"
                        title_match = re.search(title_regex, html, re.IGNORECASE)
                        if title_match:
                            meta["title"] = title_match.group(1).strip()

                        # B. Extract Description
                        # Try meta description
                        desc_regex = r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']'
                        desc_match = re.search(desc_regex, html, re.IGNORECASE)
                        if desc_match:
                            meta["description"] = desc_match.group(1)
                        else:
                            # Try OG description
                            og_desc_regex = r'<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']'
                            og_match = re.search(og_desc_regex, html, re.IGNORECASE)
                            if og_match:
                                meta["description"] = og_match.group(1)

                        # B. Extract Icon
                        # Robust "link tag" finder
                        link_regex = r"<link([^>]+)>"
                        links = re.findall(link_regex, html, re.IGNORECASE)

                        for link_attrs in links:
                            # Check if it is an icon
                            if "rel=" in link_attrs and (
                                "icon" in link_attrs or "shortcut" in link_attrs
                            ):
                                href_match = re.search(
                                    r'href=["\']([^"\']+)["\']',
                                    link_attrs,
                                    re.IGNORECASE,
                                )
                                if href_match:
                                    candidate = urljoin(url, href_match.group(1))
                                    if await self._validate_icon_url(client, candidate):
                                        meta["icon"] = candidate
                                        break  # Stop at first valid icon

                        # Fallback to old simple regex if nothing found yet
                        if not meta["icon"]:
                            icon_regex = (
                                r'<link[^>]*rel=["\'](?:shortcut\s+)?(?:apple-touch-)?'
                                r'icon["\'][^>]*href=["\']([^"\']+)["\']'
                            )
                            matches = re.findall(icon_regex, html, re.IGNORECASE)
                            if matches:
                                candidate = urljoin(url, matches[0])
                                if await self._validate_icon_url(client, candidate):
                                    meta["icon"] = candidate

                except Exception as e:
                    print(f"Error parsing HTML: {e}", flush=True)

                # 2. Try default /favicon.ico if still no icon
                if not meta["icon"]:
                    parsed = urlparse(url)
                    base_url = f"{parsed.scheme}://{parsed.netloc}"
                    favicon_url = urljoin(base_url, "/favicon.ico")
                    if await self._validate_icon_url(client, favicon_url):
                        meta["icon"] = favicon_url

        except Exception as e:
            print(f"Fetch metadata failed: {e}", flush=True)

        return meta

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
