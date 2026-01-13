
/**
 * Helper to fetch through backend proxy for HTTP URLs on HTTPS pages
 */
export const fetchProxy = async (url: string, options?: { headers?: Record<string, string>, method?: string, body?: unknown }) => {
    const isHttpUrl = url.startsWith('http://');
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (isHttpUrl && isHttpsPage) {
        // Route through backend proxy to avoid Mixed Content
        const proxyRes = await fetch('/api/v1/proxy/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                method: options?.method || 'GET',
                headers: options?.headers,
                body: options?.body
            })
        });
        const proxyData = await proxyRes.json();
        if (!proxyRes.ok) {
            throw new Error(proxyData.detail || `Proxy error: ${proxyRes.status}`);
        }
        // Return a mock Response-like object
        return {
            ok: proxyData.status_code >= 200 && proxyData.status_code < 300,
            status: proxyData.status_code,
            json: async () => proxyData.data,
            text: async () => typeof proxyData.data === 'string' ? proxyData.data : JSON.stringify(proxyData.data)
        };
    } else {
        // Direct fetch for HTTPS URLs or HTTP pages
        return fetch(url, { headers: options?.headers });
    }
};
