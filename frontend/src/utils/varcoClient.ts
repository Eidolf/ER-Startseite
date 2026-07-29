export interface VarcoShareParams {
    shareCode: string
    authorityId: string
    claimSecret?: string
    bridgeUrl: string
}

export function parseVarcoShareUrl(rawUrl: string): VarcoShareParams | null {
    if (!rawUrl) return null
    try {
        const urlObj = new URL(rawUrl)
        const pathParts = urlObj.pathname.split('/').filter(Boolean)

        // E.g. /share/U1ooH7ezOcAJiPVu2xopQg
        const shareCode = pathParts.length >= 2 && pathParts[0] === 'share' ? pathParts[1] : pathParts[0] || ''

        const searchParams = new URLSearchParams(urlObj.search)
        const hashParams = new URLSearchParams(urlObj.hash.replace(/^#/, ''))

        const authorityId = searchParams.get('authority') || hashParams.get('authority') || ''
        const claimSecret = hashParams.get('claim') || hashParams.get('key') || ''
        const bridgeUrl = searchParams.get('bridge') || hashParams.get('bridge') || urlObj.origin

        if (!shareCode || !authorityId) {
            return null
        }

        return { shareCode, authorityId, claimSecret, bridgeUrl }
    } catch {
        return null
    }
}
