# Changelog

All notable changes to the **ER-Startseite** dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Calendar Versioning](https://calver.org/) (`YYYY.M.PATCH`).

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
