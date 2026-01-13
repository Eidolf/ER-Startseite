from pydantic import BaseModel


class PremiumAppField(BaseModel):
    name: str
    label: str
    type: str = "text"  # text, password, url
    required: bool = True
    default: str | None = None
    placeholder: str | None = None


class PremiumAppDefinition(BaseModel):
    id: str
    name: str
    description: str
    default_icon: str
    fields: list[PremiumAppField] = []


class AppRegistry:
    _apps: dict[str, PremiumAppDefinition] = {}

    @classmethod
    def register(cls, app: PremiumAppDefinition):
        cls._apps[app.id] = app

    @classmethod
    def get_all(cls) -> list[PremiumAppDefinition]:
        return list(cls._apps.values())

    @classmethod
    def get(cls, app_id: str) -> PremiumAppDefinition | None:
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

# 21. ShieldDNS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_shielddns",
        name="ShieldDNS",
        description=(
            "A secure DNS Proxy supporting DNS over HTTPS (DoH) and DNS over TLS (DoT)."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/ShieldDNS/icon.png",
        fields=[URL_FIELD],
    )
)

# 22. ShieldFile
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_shieldfile",
        name="ShieldFile",
        description=("A simple file sharing service."),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/ShieldFile/icon.png",
        fields=[URL_FIELD],
    )
)

# 23. antigravity-server
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_antigravity-server",
        name="Antigravity VNC Server",
        description=("Antigravity Server for remote Access in Web via VNC"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/antigravity-server/icon.png",
        fields=[URL_FIELD],
    )
)

# BentoPDF
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_bentopdf",
        name="BentoPDF",
        description=("Self-hosted, privacy-first PDF toolkit"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/bentopdf/icon.png",
        fields=[URL_FIELD],
    )
)

# N8n
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_n8n",
        name="N8n",
        description=(
            "Workflow automation tool. N8n extends your Home Assistant with powerful workflow automation."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/n8n/icon.png",
        fields=[URL_FIELD],
    )
)

# Netboot.xyz
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_netboot-xyz",
        name="Netboot.xyz",
        description=("PXE-Server to deploy a OS inside your local network"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/netboot-xyz/icon.png",
        fields=[URL_FIELD],
    )
)

# Planka
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_planka",
        name="Planka",
        description=("The elegant open source project tracking tool"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/planka/icon.png",
        fields=[URL_FIELD],
    )
)

# pterodactyl Panel Gameserver
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_pterodactyl-panel",
        name="pterodactyl Panel Gameserver",
        description=("Open-Source Gameserver Management Panel"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/pterodactyl-panel/icon.png",
        fields=[URL_FIELD],
    )
)

# SAP ABAP Cloud Developer Trial
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_sap-abap-cloud-dev",
        name="SAP ABAP Cloud Developer Trial",
        description=("SAP ABAP Platform Trial for local ABAP development"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/sap-abap-cloud-dev/icon.png",
        fields=[URL_FIELD],
    )
)

# Solumati
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_solumati",
        name="Solumati",
        description=(
            "The Anti-Swipe Revolution - Self-hosted dating platform focused on meaningful matches."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/solumati/icon.png",
        fields=[URL_FIELD],
    )
)

# Tiny Tiny RSS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_tt-rss",
        name="Tiny Tiny RSS",
        description=("A web-based news feed (RSS/Atom) reader and aggregator"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/tt-rss/icon.png",
        fields=[URL_FIELD],
    )
)

# Wiki.JS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_wiki.js",
        name="Wiki.JS",
        description=("The most powerful and extensible open source Wiki software"),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/wiki.js/icon.png",
        fields=[URL_FIELD],
    )
)

# Wordpress
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_wordpress",
        name="Wordpress",
        description=("The most popular publication platform on the Web."),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/wordpress/icon.png",
        fields=[URL_FIELD],
    )
)
# 24. MediaWiki
AppRegistry.register(
    PremiumAppDefinition(
        id="mediawiki",
        name="MediaWiki",
        description=("The collaborative editing software that runs Wikipedia."),
        default_icon="https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/mediawiki.png",
        fields=[URL_FIELD],
    )
)
