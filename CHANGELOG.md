# Changelog

All notable changes to the **ER-Startseite** dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Calendar Versioning](https://calver.org/) (`YYYY.M.PATCH`).

## [2026.7.8] - 2026-07-30

### Added
- **Centralized Varco Bridge Background Data Sync & Relay**: Integrated persistent, server-side monitoring data storage (`data/monitoring.json`) and client-side background polling relay to sync live Varco Bridge states seamlessly across all browser sessions without requiring a primary browser tab.
- **In-Memory Live System & Collector Log Viewer**: Implemented a ring-buffered system log service (`log_service.py`) and backend endpoints (`/api/v1/system/logs`) paired with a live, auto-refreshing **Logs & Diagnose** tab in the main Settings modal for real-time debugging.
- **Master Logging Enable Toggle**: Added a master toggle button (`Logging: AN / AUS`) to turn server-side logging on or off dynamically, defaulting to `OFF` to prevent memory and CPU overhead during normal operations.
- **Custom Monitoring Categories & Management**: Enhanced the Monitoring Overlay to support creating custom categories/zones (`+ Kategorie`), deleting user-created categories (with automatic widget migration to Overview), and toggling category visibility.

### Changed
- **Reordered Settings Navigation**: Re-ordered tab navigation in the Settings modal into a logical flow: `General` → `Background` → `Logo` → `Effects` → `Widgets` → `Monitoring` → `Logs & Diagnose` → `Security` → `About`.
- **Default Privacy & Performance Settings**: Configured the Varco Bridge integration and system logging service to be disabled (`enabled = False`) by default, requiring explicit user activation.

### Fixed & Improved
- **Varco Bridge Opaque Response Handling**: Added response body inspection and graceful exception handling for Varco Bridge non-JSON opaque responses, eliminating warning log noise for standard WebSocket security handshakes.

---

## [2026.7.6] - 2026-07-27

### Added
- **TREK Premium App & Protected Webhook Endpoint**: Integrated TREK Vacation Planner app preset (`/api/v1/apps/premium`) with built-in live travel countdown stats (`registries/trek.ts`) and a secure webhook receiver endpoint (`POST /api/v1/webhooks/vacation`).
- **Dynamic Per-App Webhook Secrets**: Added opt-in Webhook switch in App Store modal with dynamic host URL generation (`window.location.origin`) and isolated, cryptographically secure secret tokens (`sec_...`).
- **Generic Countdown Event Widget**: Refactored Vacation widget into a versatile Countdown Event widget supporting custom titles (birthdays, holidays, events, deadlines), target dates, direct click-to-edit, pencil edit icon buttons, and localized `DD.MM.YYYY` date formatting.
- **Canvas & Category Board Persistence**: Extended Free Canvas Board cookie serialization (`leanWidgets`) and Category Mode rendering to fully support Countdown widgets across reloads.

### Security
- **Per-App Webhook Token Revocation**: Deleting a TREK app instance immediately invalidates its associated secret token, blocking unauthorized incoming webhook attempts with `401 Unauthorized`.
- **Public Schema Serialization Protection**: Excluded sensitive credentials (`vacationApiKey`, `vacationSecret`) from public `WidgetDefaults` JSON responses via Pydantic `Field(exclude=True)`.

---

## [2026.7.5] - 2026-07-26

### Added
- **Open-Meteo Live Weather Integration**: Integrated real-time live weather data fetching via the free Open-Meteo API (temperature, WMO condition text/icons, humidity, wind speed) supporting location queries and °C/°F units.
- **Interactive Calendar Events & Desktop Notifications**: Added event management to the Calendar widget with native OS desktop pop-up notifications (HTML5 Web Notifications API) and missed reminders catch-up on browser startup.
- **Synchronized Custom Note Widget**: Added support for creating synchronized custom text notes via the `+` Add Item modal that persist across all site visitors.
- **Clock Widget Timezone Support**: Added custom IANA timezone configuration to the Clock widget (e.g. `Europe/Berlin`, `UTC`, `America/New_York`).
- **Global Widget Defaults**: Introduced default settings for Weather location/unit and Clock time/date formats in the main Settings modal.

### Changed
- **Unified Clock Settings Interface**: Combined time format, seconds toggle, date format, and timezone configuration into a single, clean Clock Settings modal window.
- **Canvas Board Refinements**: Adjusted Canvas View layout header positioning and single-scroll container behavior.

### Security
- **Canvas Access Control Improvements**: Restricted hidden apps from appearing in Canvas Board selectors and folders for unauthenticated visitors.
- **API Key Verification**: Enforced non-empty API key checks prior to executing external app proxy fetches to prevent unauthorized or redundant external network requests.

---

## [2026.7.1] - 2026-07-26

### Added
- **Free Canvas Board View**: Added an interactive "Free Canvas Board" layout (`canvas` mode) supporting free-form positioning, dragging, and resizing for widgets, standalone app shortcuts, and expandable folder containers.
- **Expandable Folder Containers**: Created container widgets on the Canvas view with expand/collapse toggles and retroactive app editing capabilities.
- **Canvas App Launch & Sandboxed Preview**: Enforced opening apps in new browser tabs from the Canvas view and added a 2-second hover preview popup with dual **Live View** and **Image Snapshot** modes.
- **Widget Customization Options**: Made the **Clock Widget** (12h/24h toggle, seconds, date format) and **Weather Widget** (city location and temperature units °C/°F) fully configurable.
- **App Catalog Additions**: Added **Audiobookshelf** to the default application registry with logo and server URL fields.

### Fixed & Improved
- **Z-Index & Dropdown Controls**: Elevated z-index stacking contexts and added click-outside backdrop handlers for dropdown menus on the Free Canvas Board.
- **Cookie Layout Persistence**: Implemented lean cookie serialization (`er_canvas_layout_v1`) to reliably store and restore canvas widget positions, sizes, and folder contents without browser cookie size truncation.
- **Docker Container Build Optimization**: Upgraded Node.js runtime to version 24 (`node:24-slim`), suppressed debconf/useradd warnings, and authenticated Docker registry logins prior to BuildKit initialization to prevent rate-limit timeouts.
- **Code Quality & Type Hygiene**: Refactored backend version resolution with startup caching, added explicit type hints, and updated version management automation with atomic file staging and rollback safety.

### Security
- **Hardened Sandboxed Previews**: Isolated canvas hover previews using HTML5 iframe sandboxing (`allow-scripts allow-forms allow-same-origin`) to restrict top-level navigation, popups, and cross-site context access.
- **Authentication & Cookie Security**: Enhanced session cookie parameters with strict transport attributes based on incoming request scheme.
- **Proxy Endpoint Safeguards**: Applied URI scheme validation and network boundary filtering on outbound HTTP reverse proxy endpoints.

---

## [2026.7.0] - 2026-07-23

### Added
- **Atomic Data Persistence**: Implemented atomic file write operations (`.tmp` write and atomic replace) for `config.json` and `apps.json` to prevent data corruption during container restarts.
- **Automatic Configuration Backup**: Added automatic backup file generation (`.bak`) and recovery logic in `ConfigRepository` to safeguard settings.
- **Configurable Storage Path**: Centralized persistent data storage directory management via `DATA_DIR`.

### Fixed
- **Pre-Flight Compliance**: Resolved ESLint warnings and updated browserslist database.
- **Dependency Hygiene**: Upgraded dependencies to eliminate audit vulnerabilities.

### Security
- **Password Hashing Enhancements**: Upgraded internal credential verification using PBKDF2-HMAC-SHA256 with 100,000 iterations while maintaining backward compatibility.
