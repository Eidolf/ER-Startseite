import { PremiumAppManifest, FetchContext } from './types'

// Generic factory to create simple registry entries
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createGenericManifest = (id: string, name: string, _icon: string = 'AppWindow'): PremiumAppManifest => ({
    id,
    name,
    layout: 'logo-only', // Optimized for static apps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fetchStats: async (_context: FetchContext) => {
        // Return null stats means render simple tile (logo only or basic)
        // Ideally RichAppTile handles empty stats gracefully by just showing the sidebar
        return {
            // Empty stats
        }
    },
    configurableFeatures: [] // Explicitly no API features for generic apps
})

export const EmbyManifest = createGenericManifest('emby', 'Emby', 'Tv')
export const BitwardenManifest = createGenericManifest('bitwarden', 'Bitwarden', 'Lock')
export const RocketChatManifest = createGenericManifest('rocketchat', 'Rocket.Chat', 'MessageSquare')
export const PaperlessManifest = createGenericManifest('paperless', 'Paperless-ngx', 'FileText')
export const AmpManifest = createGenericManifest('amp', 'AMP Game Server', 'Gamepad2')
export const EmulatorJSManifest = createGenericManifest('emulatorjs', 'EmulatorJS', 'Gamepad')
export const NextcloudManifest = createGenericManifest('nextcloud', 'Nextcloud', 'Cloud')
export const CalibreManifest = createGenericManifest('calibre', 'Calibre Web', 'BookOpen')
export const PortainerManifest = createGenericManifest('portainer', 'Portainer', 'Container')
export const JDownloaderManifest = createGenericManifest('jdownloader', 'jDownloader', 'Download')
export const GrocyManifest = createGenericManifest('grocy', 'Grocy')
export const HomeAssistantManifest = createGenericManifest('homeassistant', 'Home Assistant')
export const MediawikiManifest = createGenericManifest('mediawiki', 'MediaWiki')
