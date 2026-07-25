# Changelog

All notable changes to the **ER-Startseite** dashboard project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2026-07-23

### Security Improvements
- **Password Hashing Upgrade**: Upgraded internal password storage mechanism to use PBKDF2-HMAC-SHA256 with 100,000 iterations while maintaining backward compatibility for legacy hashes.
- **Dynamic Auth Cookie Security**: Enhanced `access_token` cookie generation to dynamically set the `secure` flag based on incoming request scheme (`https`).
- **Proxy Endpoint Safeguards**: Added scheme validation (HTTP/HTTPS only) and Cloud Metadata IP filtering on HTTP reverse proxy endpoints.

### Fixed & Enhanced
- **Atomic Data Persistence**: Implemented atomic file write operations (`.tmp` write and atomic replace) for `config.json` and `apps.json` to prevent data corruption during container restarts or abrupt shutdowns.
- **Configuration Backup & Automatic Recovery**: Added automatic backup file generation (`.bak`) and fallback recovery logic in `ConfigRepository` to protect user settings from transient read errors or corrupted storage.
- **Configurable Storage Path**: Centralized persistent data storage directory management via `DATA_DIR` configuration setting.
- **ESLint & Pre-Flight Compliance**: Resolved `@typescript-eslint/no-unused-vars` warning in `SettingsModal.tsx` and validated full pre-flight test suite.
- **Docker & NPM Cleanup**: Fixed `debconf` frontend initialization warnings in backend Dockerfile (`DEBIAN_FRONTEND=noninteractive`), suppressed NPM update/fund notices, updated `caniuse-lite`/browserslist database, upgraded `@typescript-eslint/*` to resolve 22 vulnerability audit issues (0 vulnerabilities remaining).
