export interface VarcoShareParams {
    shareCode: string
    authorityId: string
    claimSecret?: string
    bridgeUrl: string
}

export function parseVarcoShareUrl(rawUrl: string, settings?: Record<string, unknown>): VarcoShareParams | null {
    if (!rawUrl) return null
    try {
        const urlObj = new URL(rawUrl)
        const pathParts = urlObj.pathname.split('/').filter(Boolean)

        const searchParams = new URLSearchParams(urlObj.search)
        const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''))

        function searchParamsGet(key: string, fallback: string = ''): string {
            return searchParams.get(key) || hashParams.get(key) || fallback
        }

        function getStringSetting(key: string): string {
            const val = settings?.[key]
            return typeof val === 'string' ? val : ''
        }

        const authorityId =
            searchParamsGet('authority') ||
            searchParamsGet('authority_id') ||
            searchParamsGet('authorityId') ||
            getStringSetting('authorityId') ||
            getStringSetting('authority_id')

        const claimSecret = searchParamsGet('claim') || searchParamsGet('key') || getStringSetting('claimSecret')

        const bridgeUrl =
            searchParamsGet('bridge') ||
            searchParamsGet('bridge_url') ||
            getStringSetting('bridgeUrl') ||
            getStringSetting('bridge_url') ||
            urlObj.origin

        const finalShareCode =
            searchParamsGet('shareCode') ||
            searchParamsGet('share_code') ||
            (pathParts.length >= 2 && pathParts[0] === 'share' ? pathParts[1] : pathParts[0] || '') ||
            getStringSetting('shareCode') ||
            getStringSetting('share_code')

        if (!finalShareCode || !authorityId) {
            return null
        }

        return { shareCode: finalShareCode, authorityId, claimSecret, bridgeUrl }
    } catch {
        return null
    }
}
