# AI Developer Handbook (`AGENTS.md`)

This document serves as the primary technical reference manual and guidelines for AI agents working on the **ER-Startseite** codebase.

---

## 1. Token Efficiency Rules

AI agents operating in this repository must strictly adhere to the following token-saving rules:

- **Bullet-Point Prose Only**: Limit explanatory text to concise bullet points. Eliminate conversational filler, pleasantries, or introductory setup phrasing.
- **Targeted File Line Reads**: Restrict `view_file` calls to specific line ranges (`StartLine`/`EndLine`) instead of reading full 800-line blocks whenever possible.
- **Parallel Tool Execution**: Execute independent tool calls concurrently in a single turn (e.g. multi-file inspections or sequential file writes).
- **No Code Re-Echoing**: Never repeat code blocks in chat output that were just created or edited using file editing tools.

---

## 2. Subagent Strategy

When handling multi-stage or long-running tasks, delegate work to subagents as follows:

- **Read-Only Research**: Delegate codebase exploration, dependency audits, or log analysis to subagents to preserve primary context space.
- **Test Suite Execution**: Run test suites or static analyzer passes (`pytest`, `ruff`, `mypy`, `eslint`) via background tasks or subagents.
- **Parallel Sub-Tasks**: Split non-overlapping modifications (e.g., frontend component creation alongside backend route definition) into separate sub-tasks.
- **Workspace Isolation Levels**:
  - **Inherit (Default)**: Direct context sharing for standard feature additions and bug fixes within the main workspace.
  - **Branch**: Spin up an isolated subagent branch for experimental refactoring or disruptive architectural changes.
  - **Share**: Shared workspace access when multiple subagents work on linked frontend-backend integration flows.

---

## 3. Single Source of Truth

- Before running recursive grep searches across the repository, agents **MUST FIRST** read `project_manifest.json` and `project_connections.json`.
- Use `project_manifest.json` to inspect entry points, API route definitions, Pydantic schemas, and component trees.
- Use `project_connections.json` to identify full cross-stack file sets associated with core user features before editing code.

---

## 4. Codebase Architecture

The project follows a decoupled architecture separating a FastAPI backend from a React TypeScript SPA frontend.

| Layer | Directory / Entry Point | Technology Stack | Description |
| :--- | :--- | :--- | :--- |
| **Backend** | `backend/app/main.py` | Python 3.11, FastAPI, Pydantic v2, Poetry | RESTful API service providing app catalogs, auth, media upload, and CORS proxying |
| **Frontend** | `frontend/src/main.tsx` | React 18, TypeScript, Vite, Tailwind CSS | Single Page Application (SPA) dashboard with drag-and-drop grid management |
| **Data / Storage** | `data/` | JSON Storage | Persistent JSON storage directory (`data/config.json`, `data/apps.json`) |
| **Scripts** | `scripts/` | Python | Automation and code generation scripts (`generate_manifest.py`, `version_manager.py`) |
| **CI / Workflows** | `.github/workflows/` | GitHub Actions | Automated CI build, PR validation, release orchestration, and rollback pipelines |

---

## 5. CLI Commands Reference

All standard commands for local development, linting, formatting, type checking, and testing are tabulated below:

| Operation | Target Layer | Command |
| :--- | :--- | :--- |
| **Dev Server** | Backend | `cd backend && poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` |
| **Dev Server** | Frontend | `cd frontend && npm run dev` |
| **Docker Start** | Full Stack | `docker-compose up -d` |
| **Linting** | Backend | `cd backend && poetry run ruff check .` |
| **Linting** | Frontend | `cd frontend && npm run lint` |
| **Formatting Check**| Backend | `cd backend && poetry run black --check .` |
| **Format Auto-fix** | Backend | `cd backend && poetry run black .` |
| **Type Check** | Backend | `cd backend && poetry run mypy .` |
| **Type Check** | Frontend | `cd frontend && npx tsc --noEmit` |
| **Run All Tests** | Backend | `cd backend && poetry run pytest` |
| **Run Targeted Test**| Backend | `cd backend && poetry run pytest tests/test_file.py::test_name` |
| **Pre-Flight Check** | Full Stack | `./check-prepush.sh` |
| **Generate Manifest**| Full Stack | `python3 scripts/generate_manifest.py` |

---

## 6. Project Coding Rules & Quality Hygiene

- **Language Standard**: All source code, comments, docstrings, commit messages, and documentation must be written strictly in English.
- **Strict Typing**:
  - Backend: All function parameters and return types must have explicit Python type annotations (`str | None`, `dict[str, Any]`, `list[App]`).
  - Frontend: Use strict TypeScript types. Avoid using `any` unless handling dynamic external API payloads.
- **Error Handling**:
  - Never swallow exceptions with empty `except` blocks.
  - Raise custom domain exceptions extending `BackendException` or `AuthException`.
  - Preserve error tracebacks and log details using `structlog`.
- **Concurrency & I/O**:
  - Use `async/await` for all non-blocking I/O in FastAPI routes and httpx client requests.
  - Set explicit request timeouts (e.g. 30s) on all outbound HTTP proxy requests to prevent thread blocking.
- **Script & Asset Hygiene**:
  - Place all reusable build/maintenance scripts in `/scripts/`.
  - Save temporary scratch files in `/scratch/`.
  - Never hardcode secrets, passwords, or credentials in source code or default configuration files.
