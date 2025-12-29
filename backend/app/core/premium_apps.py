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
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/emby.png",
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

# 6. Lidarr
AppRegistry.register(
    PremiumAppDefinition(
        id="lidarr",
        name="Lidarr",
        description="Music collection manager for Usenet and BitTorrent users.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/lidarr.png",
        fields=[URL_FIELD],
    )
)

# 7. Radarr
AppRegistry.register(
    PremiumAppDefinition(
        id="radarr",
        name="Radarr",
        description="Movie collection manager for Usenet and BitTorrent users.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png",
        fields=[URL_FIELD],
    )
)

# 8. Sonarr
AppRegistry.register(
    PremiumAppDefinition(
        id="sonarr",
        name="Sonarr",
        description="Smart PVR for newsgroup and bittorrent users.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png",
        fields=[URL_FIELD],
    )
)

# 9. Readarr
AppRegistry.register(
    PremiumAppDefinition(
        id="readarr",
        name="Readarr",
        description="Book Manager and Automation (Sonarr for Books).",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/readarr.png",
        fields=[URL_FIELD],
    )
)

# 10. Prowlarr
AppRegistry.register(
    PremiumAppDefinition(
        id="prowlarr",
        name="Prowlarr",
        description="Indexer manager/proxy built on the popular *arr .net/react stack.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/prowlarr.png",
        fields=[URL_FIELD],
    )
)

# 11. AMP Game Server
AppRegistry.register(
    PremiumAppDefinition(
        id="amp",
        name="AMP Game Server",
        description="Application Management Panel for Game Servers.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/amp.png",
        fields=[URL_FIELD],
    )
)

# 12. EmulatorJS
AppRegistry.register(
    PremiumAppDefinition(
        id="emulatorjs",
        name="EmulatorJS",
        description="Web-based emulator frontend.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/emulatorjs.png",
        fields=[URL_FIELD],
    )
)

# 13. Nextcloud
AppRegistry.register(
    PremiumAppDefinition(
        id="nextcloud",
        name="Nextcloud",
        description="The self-hosted productivity platform.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nextcloud.png",
        fields=[URL_FIELD],
    )
)

# 14. Calibre Web
AppRegistry.register(
    PremiumAppDefinition(
        id="calibre-web",
        name="Calibre Web",
        description="Web app for browsing, reading and downloading eBooks.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/calibre-web.png",
        fields=[URL_FIELD],
    )
)

# 15. SABnzbd
AppRegistry.register(
    PremiumAppDefinition(
        id="sabnzbd",
        name="SABnzbd",
        description="Open source binary newsreader.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sabnzbd.png",
        fields=[URL_FIELD],
    )
)

# 16. Portainer
AppRegistry.register(
    PremiumAppDefinition(
        id="portainer",
        name="Portainer",
        description="Making Docker and Kubernetes management easy.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png",
        fields=[URL_FIELD],
    )
)

# 17. jDownloader
AppRegistry.register(
    PremiumAppDefinition(
        id="jdownloader",
        name="jDownloader",
        description="Download management tool.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jdownloader.png",
        fields=[URL_FIELD],
    )
)

# 18. Grocy
AppRegistry.register(
    PremiumAppDefinition(
        id="grocy",
        name="Grocy",
        description="ERP beyond your fridge.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grocy.png",
        fields=[URL_FIELD],
    )
)

# 19. Home Assistant
AppRegistry.register(
    PremiumAppDefinition(
        id="home-assistant",
        name="Home Assistant",
        description="Open source home automation that puts local control and privacy first.",
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png",
        fields=[URL_FIELD],
    )
)
