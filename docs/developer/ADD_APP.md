# How to Add a New Premium App Integration

The "Premium App" system uses a registry-based approach, allowing developers to add new integrations without modifying the core UI components.

## Overview

Each app Integration consists of:
1.  **Manifest File**: A TypeScript file (e.g., `src/registries/myapp.ts`) that defines the app's metadata, layout, and data fetching logic.
2.  **Registry Entry**: Adding the manifest to the central registry index (`src/registries/index.ts`).

## 1. Create a Manifest File

Create a new file in `frontend/src/registries/` named after your app (e.g., `myapp.ts`).

### Template

```typescript
import { PremiumAppManifest, FetchContext } from './types'

export const MyAppManifest: PremiumAppManifest = {
    id: 'myapp',        // Unique ID (must match 'integration' field in backend/data/apps.json)
    name: 'My App',     // Display Name
    layout: 'mixed',    // Layout Type: 'grid-4' | 'rows-2' | 'mixed'
    
    // Function to fetch data from the app's API
    fetchStats: async ({ app, fetch, isAuthenticated }: FetchContext) => {
        // ... Logic to fetch data ...
        
        return {
            // Return data mapped to layout slots
            'top': {
                label: 'Status',
                value: 'Online',
                icon: 'Activity', // Lucide Icon Name
                color: 'text-green-500' // Tailwind class
            }
        }
    }
}
```

### Layout Options

*   **`grid-4`**: Four small stats.
    *   Slots: `tl` (Top-Left), `tr` (Top-Right), `bl` (Bottom-Left), `br` (Bottom-Right).
*   **`rows-2`**: Two full-width rows.
    *   Slots: `top`, `bottom`.
*   **`mixed`**: Flexible mix.
    *   Common usage: `top` (main stat), `bottom` (secondary stat).
*   **`logo-only`**: **Static Apps (No API)**.
    *   Displays the logo centered in the tile.
    *   Hides the statistics column entirely.
    *   Useful for apps like Bitwarden, MediaWiki, etc.

### Data Fetching (`fetchStats`)

The `fetchStats` function receives a `FetchContext`:
*   `app`: The `AppData` object containing the URL and API key.
*   `fetch`: A proxy-enabled fetch function (handles CORS and Mixed Content automatically).
*   `isAuthenticated`: Boolean indicating if the user is logged in (useful for hiding protected stats).

**Return Value**:
A record where keys match the layout slots, and values are either:
*   `StatItem`: `{ label, value, icon, color }`
*   `'protected'`: Shows a "Protected" placeholder if the user isn't logged in.
*   `null`: Shows nothing in that slot.

## 2. Register the App

Open `frontend/src/registries/index.ts` and export your manifest:

```typescript
import { MyAppManifest } from './myapp'

export const AppRegistry: Record<string, PremiumAppManifest> = {
    // ... existing apps ...
    [MyAppManifest.id]: MyAppManifest
}
```

## 3. Configuration & Features

### Configurable Features

To show API configuration fields (API URL, API Key) and specific feature toggles in the generic "Edit App" modal, you MUST define `configurableFeatures` in your manifest.

```typescript
export const MyAppManifest: PremiumAppManifest = {
    // ...
    // Only 'queue' and 'stats' toggles will be shown.
    // If this array is empty or undefined, NO API settings will be shown (useful for static apps).
    configurableFeatures: ['queue', 'stats'], 
    
    fetchStats: async (...) => { ... }
}
```

Supported features: `'queue', 'stats', 'movies', 'tv', 'series', 'books', 'calendar'`.

### Static Apps (Logo Only)

For apps that do not require valid API connections (e.g. MediaWiki, Bitwarden), use the `logo-only` layout and leave `configurableFeatures` empty (or explicit `[]`).

```typescript
export const MediaWikiManifest: PremiumAppManifest = {
    id: 'mediawiki',
    name: 'MediaWiki',
    layout: 'logo-only',
    configurableFeatures: [], // Hides API Key/URL inputs
    fetchStats: async () => ({})
}
```

## 4. Usage & Integration

Integrations are automatically linked when:
1.  **Adding from App Store**: The user selects the app from the "App Store" tab.
2.  **Editing an App**: If the app was previously added as a Premium App.

*Note: The "Integration" dropdown has been removed from the "Custom App" form to simplify the UI.*

---

## Example: Simple API Call

```typescript
    fetchStats: async ({ app, fetch }) => {
        const url = `${app.url}/api/status?apikey=${app.api_key}`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            return {
                'top': { label: 'Users', value: data.user_count, icon: 'Users' }
            };
        } catch (e) {
            return {}; // Handle errors gracefully
        }
    }
```
