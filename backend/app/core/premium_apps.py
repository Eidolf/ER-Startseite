from typing import Dict, List, Optional

from pydantic import BaseModel


class PremiumAppField(BaseModel):
    name: str
    label: str
    type: str = "text"  # text, password, url
    required: bool = True
    default: Optional[str] = None
    placeholder: Optional[str] = None


class PremiumAppDefinition(BaseModel):
    id: str
    name: str
    description: str
    default_icon: str
    fields: List[PremiumAppField] = []


class AppRegistry:
    _apps: Dict[str, PremiumAppDefinition] = {}

    @classmethod
    def register(cls, app: PremiumAppDefinition):
        cls._apps[app.id] = app

    @classmethod
    def get_all(cls) -> List[PremiumAppDefinition]:
        return list(cls._apps.values())

    @classmethod
    def get(cls, app_id: str) -> Optional[PremiumAppDefinition]:
        return cls._apps.get(app_id)


# --- Define Initial Apps ---

# Common fields
URL_FIELD = PremiumAppField(
    name="url", label="Server URL", type="url", placeholder="https://example.com"
)

# 1. Emby
AppRegistry.register(
    PremiumAppDefinition(
        id="emby",
        name="Emby",
        description="Your personal media server.",
        default_icon="https://raw.githubusercontent.com/MediaBrowser/Emby.Resources/master/images/Logos/logo.png",
        fields=[URL_FIELD],
    )
)

# 2. Bitwarden
AppRegistry.register(
    PremiumAppDefinition(
        id="bitwarden",
        name="Bitwarden",
        description="Secure password management for all of your devices.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bitwarden.png",
        fields=[URL_FIELD],
    )
)

# 3. Ombi
AppRegistry.register(
    PremiumAppDefinition(
        id="ombi",
        name="Ombi",
        description="Interface for users to request content for Plex/Emby/Jellyfin.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/ombi.png",
        fields=[URL_FIELD],
    )
)

# 4. Rocket.Chat
AppRegistry.register(
    PremiumAppDefinition(
        id="rocketchat",
        name="Rocket.Chat",
        description="The ultimate communication platform.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/rocket-chat.png",
        fields=[URL_FIELD],
    )
)

# 5. Paperless-ngx
AppRegistry.register(
    PremiumAppDefinition(
        id="paperless-ngx",
        name="Paperless-ngx",
        description="Community-supported document management system.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/paperless-ngx.png",
        fields=[URL_FIELD],
    )
)
