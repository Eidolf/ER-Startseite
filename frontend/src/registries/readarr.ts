import { PremiumAppManifest, FetchContext } from './types'

export const ReadarrManifest: PremiumAppManifest = {
    id: 'readarr',
    name: 'Readarr',
    layout: 'mixed',
    configurableFeatures: ['queue', 'books'],
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        const config = app.api_config || {}
        const showQueue = config.queue?.enabled ?? true;
        const showBooks = config.books?.enabled ?? true;
        const protectQueue = config.queue?.protected ?? false;
        const protectBooks = config.books?.protected ?? false;
        const globalProtected = app.api_protected

        const baseUrl = (app.api_url || app.url || '').replace(/\/$/, '')
        const apiKey = app.api_key?.trim() || ''
        const appendAuth = (url: string) => `${url}${url.includes('?') ? '&' : '?'}apikey=${apiKey}`

        let queueCount: number | 'protected' = 0
        let bookCount: number | 'protected' = 0

        if (showQueue) {
            if ((globalProtected || protectQueue) && !isAuthenticated) {
                queueCount = 'protected'
            } else {
                try {
                    const res = await fetch(appendAuth(`${baseUrl}/api/v1/queue?pageSize=1`))
                    if (res.ok) {
                        const data = await res.json()
                        queueCount = data.totalRecords || 0
                    }
                } catch (e) { console.error("Readarr queue fetch failed", e) }
            }
        }

        if (showBooks) {
            if ((globalProtected || protectBooks) && !isAuthenticated) {
                bookCount = 'protected'
            } else {
                try {
                    const res = await fetch(appendAuth(`${baseUrl}/api/v1/book?pageSize=1`)) // Just check totalRecords
                    if (res.ok) {
                        const data = await res.json()
                        bookCount = data.totalRecords || 0
                    }
                } catch (e) { console.error("Readarr books fetch failed", e) }
            }
        }

        return {
            'top': queueCount === 'protected' ? 'protected' : {
                label: 'Queue',
                value: queueCount,
                icon: 'ArrowUpFromLine',
                color: 'text-orange-400'
            },
            'bottom': bookCount === 'protected' ? 'protected' : {
                label: 'Books',
                value: bookCount,
                icon: 'Book',
                color: 'text-green-400'
            }
        }
    }
}
