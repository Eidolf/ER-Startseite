/**
 * Utility helper functions for managing browser cookies with JSON serialization.
 */

export function setCookie(name: string, value: string, days: number = 365): void {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
    const nameEQ = `${encodeURIComponent(name)}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
    }
    return null;
}

export function deleteCookie(name: string): void {
    document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getJsonCookie<T>(name: string, fallback: T): T {
    try {
        const raw = getCookie(name);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export function setJsonCookie<T>(name: string, data: T, days: number = 365): void {
    try {
        const serialized = JSON.stringify(data);
        setCookie(name, serialized, days);
    } catch (e) {
        console.error('Failed to set cookie:', e);
    }
}
