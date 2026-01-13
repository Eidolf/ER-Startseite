import { PremiumAppManifest } from './types'
import { LidarrManifest } from './lidarr'
import { OmbiManifest } from './ombi'
import { RadarrManifest } from './radarr'
import { SonarrManifest } from './sonarr'
import { ReadarrManifest } from './readarr'
import { SabnzbdManifest } from './sabnzbd'
import {
    EmbyManifest, BitwardenManifest, RocketChatManifest, PaperlessManifest,
    AmpManifest, EmulatorJSManifest, NextcloudManifest, CalibreManifest,
    PortainerManifest, JDownloaderManifest, GrocyManifest, HomeAssistantManifest,
    MediawikiManifest
} from './generic'

export const AppRegistry: Record<string, PremiumAppManifest> = {
    [LidarrManifest.id]: LidarrManifest,
    [OmbiManifest.id]: OmbiManifest,
    [RadarrManifest.id]: RadarrManifest,
    [SonarrManifest.id]: SonarrManifest,
    [ReadarrManifest.id]: ReadarrManifest,
    [SabnzbdManifest.id]: SabnzbdManifest,
    [EmbyManifest.id]: EmbyManifest,
    [BitwardenManifest.id]: BitwardenManifest,
    [RocketChatManifest.id]: RocketChatManifest,
    [PaperlessManifest.id]: PaperlessManifest,
    [AmpManifest.id]: AmpManifest,
    [EmulatorJSManifest.id]: EmulatorJSManifest,
    [NextcloudManifest.id]: NextcloudManifest,
    [CalibreManifest.id]: CalibreManifest,
    [PortainerManifest.id]: PortainerManifest,
    [JDownloaderManifest.id]: JDownloaderManifest,
    [GrocyManifest.id]: GrocyManifest,
    [HomeAssistantManifest.id]: HomeAssistantManifest,
    [MediawikiManifest.id]: MediawikiManifest
}
