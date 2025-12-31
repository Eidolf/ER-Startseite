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
        description=(
            "The detailed open media solution for your personal media server."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/emby.png",
        fields=[URL_FIELD],
    )
)

# 2. Bitwarden
AppRegistry.register(
    PremiumAppDefinition(
        id="bitwarden",
        name="Bitwarden",
        description=("A secure and free password manager for all of your devices."),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/bitwarden.png",
        fields=[URL_FIELD],
    )
)

# 3. Ombi
AppRegistry.register(
    PremiumAppDefinition(
        id="ombi",
        name="Ombi",
        description=(
            "A self-hosted web application that automatically gives your shared "
            "Plex or Emby users the ability to request content by themselves!"
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/ombi.png",
        fields=[URL_FIELD],
    )
)

# 4. Rocket.Chat
AppRegistry.register(
    PremiumAppDefinition(
        id="rocketchat",
        name="Rocket.Chat",
        description=(
            "A customizable open source communications platform for organizations "
            "with high data protection standards."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/rocket-chat.png",
        fields=[URL_FIELD],
    )
)

# 5. Paperless-ngx
AppRegistry.register(
    PremiumAppDefinition(
        id="paperless-ngx",
        name="Paperless-ngx",
        description=(
            "A community-supported supercharged version of Paperless: "
            "scan, index and archive all your physical documents."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/paperless-ngx.png",
        fields=[URL_FIELD],
    )
)

# 6. Lidarr
AppRegistry.register(
    PremiumAppDefinition(
        id="lidarr",
        name="Lidarr",
        description=(
            "A music collection manager for Usenet and BitTorrent users. "
            "It monitors multiple RSS feeds for new tracks for artists you are monitoring."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/lidarr.png",
        fields=[URL_FIELD],
    )
)

# 7. Radarr
AppRegistry.register(
    PremiumAppDefinition(
        id="radarr",
        name="Radarr",
        description=(
            "A movie collection manager for Usenet and BitTorrent users. "
            "It monitors multiple RSS feeds for new movies and will interface with clients and indexers."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/radarr.png",
        fields=[URL_FIELD],
    )
)

# 8. Sonarr
AppRegistry.register(
    PremiumAppDefinition(
        id="sonarr",
        name="Sonarr",
        description=(
            "Smart PVR for newsgroup and bittorrent users. Sonarr can monitor "
            "multiple RSS feeds for new episodes of your favorite shows and will grab, sort and rename them."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sonarr.png",
        fields=[URL_FIELD],
    )
)

# 9. Readarr
AppRegistry.register(
    PremiumAppDefinition(
        id="readarr",
        name="Readarr",
        description=(
            "Book Manager and Automation (Sonarr for Books). It monitors "
            "multiple RSS feeds for new books from authors you are monitoring."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/readarr.png",
        fields=[URL_FIELD],
    )
)

# 10. Prowlarr
AppRegistry.register(
    PremiumAppDefinition(
        id="prowlarr",
        name="Prowlarr",
        description=(
            "Prowlarr is a sophisticated indexer manager/proxy built on the popular "
            "*arr .net/react stack to integrate with your various PVR apps."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/prowlarr.png",
        fields=[URL_FIELD],
    )
)

# 11. AMP Game Server
AppRegistry.register(
    PremiumAppDefinition(
        id="amp",
        name="AMP Game Server",
        description=(
            "Application Management Panel (AMP) allows you to easily manage "
            "and host your own game servers on Linux or Windows."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/amp.png",
        fields=[URL_FIELD],
    )
)

# 12. EmulatorJS
AppRegistry.register(
    PremiumAppDefinition(
        id="emulatorjs",
        name="EmulatorJS",
        description=(
            "A web-based emulator frontend that lets you play retro games directly in your browser."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/emulatorjs.png",
        fields=[URL_FIELD],
    )
)

# 13. Nextcloud
AppRegistry.register(
    PremiumAppDefinition(
        id="nextcloud",
        name="Nextcloud",
        description=(
            "The self-hosted productivity platform that keeps you in control. "
            "File sharing, communication, and more."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/nextcloud.png",
        fields=[URL_FIELD],
    )
)

# 14. Calibre Web
AppRegistry.register(
    PremiumAppDefinition(
        id="calibre-web",
        name="Calibre Web",
        description=(
            "A web interface for browsing, reading, and downloading eBooks from an existing Calibre database."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/calibre-web.png",
        fields=[URL_FIELD],
    )
)

# 15. SABnzbd
AppRegistry.register(
    PremiumAppDefinition(
        id="sabnzbd",
        name="SABnzbd",
        description=(
            "Free and easy-to-use newsreader for Usenet. It makes Usenet as simple and streamlined as possible."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/sabnzbd.png",
        fields=[URL_FIELD],
    )
)

# 16. Portainer
AppRegistry.register(
    PremiumAppDefinition(
        id="portainer",
        name="Portainer",
        description=(
            "A powerful toolset that allows you to easily build and manage "
            "your modern cloud-native applications in Docker / Kubernetes."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/portainer.png",
        fields=[URL_FIELD],
    )
)

# 17. jDownloader
AppRegistry.register(
    PremiumAppDefinition(
        id="jdownloader",
        name="jDownloader",
        description=(
            "JDownloader is a free, open-source download management tool with a huge community "
            "of developers that makes downloading as easy and fast as it should be."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/jdownloader.png",
        fields=[URL_FIELD],
    )
)

# 18. Grocy
AppRegistry.register(
    PremiumAppDefinition(
        id="grocy",
        name="Grocy",
        description=(
            "Grocy is a web-based self-hosted groceries & household management solution for your home."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/grocy.png",
        fields=[URL_FIELD],
    )
)

# 19. Home Assistant
AppRegistry.register(
    PremiumAppDefinition(
        id="home-assistant",
        name="Home Assistant",
        description=(
            "Open source home automation that puts local control and privacy first. "
            "Powered by a worldwide community of tinkerers and DIY enthusiasts."
        ),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/home-assistant.png",
        fields=[URL_FIELD],
    )
)
