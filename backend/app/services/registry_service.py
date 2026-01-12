import httpx

from app.core.premium_apps import AppRegistry, PremiumAppDefinition


class RegistryService:
    async def fetch_registry(self, url: str) -> list[PremiumAppDefinition]:
        """
        Fetches a registry from a given URL and validates its content.
        """
        try:
            async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                if not isinstance(data, list):
                    raise ValueError("Registry data must be a list of app definitions")

                apps = []
                for item in data:
                    # Validate basic structure
                    if not all(
                        key in item
                        for key in ["id", "name", "description", "default_icon"]
                    ):
                        continue
                    apps.append(PremiumAppDefinition(**item))
                return apps
        except Exception as e:
            print(f"Error fetching registry from {url}: {e}", flush=True)
            return []

    async def validate_registry_url(self, url: str) -> bool:
        """
        Validates if a URL points to a valid registry.
        """
        try:
            async with httpx.AsyncClient(verify=False, timeout=5.0) as client:
                response = await client.get(url)
                if response.status_code != 200:
                    return False
                data = response.json()
                return isinstance(data, list)
        except Exception:
            return False

    async def get_all_premium_apps(
        self, registry_urls: list[str]
    ) -> list[PremiumAppDefinition]:
        """
        Combines the built-in apps with apps from custom registries.
        """
        all_apps = AppRegistry.get_all()
        seen_ids = {app.id for app in all_apps}

        for url in registry_urls:
            registry_apps = await self.fetch_registry(url)
            for app in registry_apps:
                if app.id not in seen_ids:
                    all_apps.append(app)
                    seen_ids.add(app.id)

        return all_apps
