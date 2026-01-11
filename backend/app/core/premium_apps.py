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

# --- FaserF/hassio-addons ---

# 20. AegisBot
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_aegisbot",
        name="AegisBot",
        description=(
            "A discord bot that can moderate your server, and also has some fun commands."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/AegisBot/icon.png",
        fields=[URL_FIELD],
    )
)

# 21. ShieldDNS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_shielddns",
        name="ShieldDNS",
        description=(
            "A DNS server that blocks ads and trackers."
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
        description=(
            "A simple file sharing service."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/ShieldFile/icon.png",
        fields=[URL_FIELD],
    )
)

# 23. antigravity-server
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_antigravity-server",
        name="antigravity-server",
        description=(
            "Antigravity Server"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/antigravity-server/icon.png",
        fields=[URL_FIELD],
    )
)

# Apache2 Minimal MariaDB
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_apache2-minimal-mariadb",
        name="Apache2 Minimal MariaDB",
        description=(
            "Open Source Webserver with PHP and MariaDB."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/apache2-minimal-mariadb/icon.png",
        fields=[URL_FIELD],
    )
)

# Apache2 Minimal
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_apache2-minimal",
        name="Apache2 Minimal",
        description=(
            "Open Source Webserver with PHP and MariaDB."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/apache2-minimal/icon.png",
        fields=[URL_FIELD],
    )
)

# Apache2
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_apache2",
        name="Apache2",
        description=(
            "Open Source Webserver with PHP and MariaDB."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/apache2/icon.png",
        fields=[URL_FIELD],
    )
)

# Bash Script Executer
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_bash_script_executer",
        name="Bash Script Executer",
        description=(
            "Execute your own bash scripts inside this Homeassistant Addon environment."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/bash_script_executer/icon.png",
        fields=[URL_FIELD],
    )
)

# BentoPDF
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_bentopdf",
        name="BentoPDF",
        description=(
            "Self-hosted, privacy-first PDF toolkit"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/bentopdf/icon.png",
        fields=[URL_FIELD],
    )
)

# ER-Startseite (Dashboard)
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_er-dashboard",
        name="ER-Startseite (Dashboard)",
        description=(
            "A modern, highly customizable dashboard with a neon aesthetic."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/er-dashboard/icon.png",
        fields=[URL_FIELD],
    )
)

# Home Assistant Test Instance
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_homeassistant-test-instance",
        name="Home Assistant Test Instance",
        description=(
            "A standalone Home Assistant Core instance for testing purposes."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/homeassistant-test-instance/icon.png",
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
        description=(
            "PXE-Server to deploy a OS inside your local network"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/netboot-xyz/icon.png",
        fields=[URL_FIELD],
    )
)

# NGINX
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_nginx",
        name="NGINX",
        description=(
            "Open Source Webserver with PHP and MariaDB."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/nginx/icon.png",
        fields=[URL_FIELD],
    )
)

# OpenSSL
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_openssl",
        name="OpenSSL",
        description=(
            "Generate self-signed certificates"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/openssl/icon.png",
        fields=[URL_FIELD],
    )
)

# Planka
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_planka",
        name="Planka",
        description=(
            "The elegant open source project tracking tool"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/planka/icon.png",
        fields=[URL_FIELD],
    )
)

# pterodactyl Panel Gameserver
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_pterodactyl-panel",
        name="pterodactyl Panel Gameserver",
        description=(
            "Open-Source Gameserver Management Panel"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/pterodactyl-panel/icon.png",
        fields=[URL_FIELD],
    )
)

# pterodactyl Wings Gameserver
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_pterodactyl-wings",
        name="pterodactyl Wings Gameserver",
        description=(
            "Open Source Gameserver"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/pterodactyl-wings/icon.png",
        fields=[URL_FIELD],
    )
)

# SAP ABAP Cloud Developer Trial
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_sap-abap-cloud-dev",
        name="SAP ABAP Cloud Developer Trial",
        description=(
            "SAP ABAP Platform Trial for local ABAP development"
        ),
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

# Switch LAN Play Client
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_switch_lan_play",
        name="Switch LAN Play Client",
        description=(
            "Nintendo Switch Lan Play -Client"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/switch_lan_play/icon.png",
        fields=[URL_FIELD],
    )
)

# Switch LAN Play Server
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_switch_lan_play_server",
        name="Switch LAN Play Server",
        description=(
            "Nintendo Switch Lan Play -Server"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/switch_lan_play_server/icon.png",
        fields=[URL_FIELD],
    )
)

# Tado Auto Assist
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_tado_aa",
        name="Tado Auto Assist",
        description=(
            "Tado Auto-Assist for Geofencing and open Window detection"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/tado_aa/icon.png",
        fields=[URL_FIELD],
    )
)

# Tiny Tiny RSS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_tt-rss",
        name="Tiny Tiny RSS",
        description=(
            "A web-based news feed (RSS/Atom) reader and aggregator"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/tt-rss/icon.png",
        fields=[URL_FIELD],
    )
)

# WhatsApp
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_whatsapp",
        name="WhatsApp",
        description=(
            "Home Assistant WhatsApp Backend (Baileys/Node.js)"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/whatsapp/icon.png",
        fields=[URL_FIELD],
    )
)

# Wiki.JS
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_wiki.js",
        name="Wiki.JS",
        description=(
            "The most powerful and extensible open source Wiki software"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/wiki.js/icon.png",
        fields=[URL_FIELD],
    )
)

# Wiki.JS V3 (Beta)
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_wiki.js3",
        name="Wiki.JS V3 (Beta)",
        description=(
            "The most powerful and extensible open source Wiki software (Version 3 - Beta)"
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/wiki.js3/icon.png",
        fields=[URL_FIELD],
    )
)

# Wordpress
AppRegistry.register(
    PremiumAppDefinition(
        id="hassio_wordpress",
        name="Wordpress",
        description=(
            "The most popular publication platform on the Web."
        ),
        default_icon="https://raw.githubusercontent.com/FaserF/hassio-addons/master/wordpress/icon.png",
        fields=[URL_FIELD],
    )
)
