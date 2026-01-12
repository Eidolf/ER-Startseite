# ER-Startseite 🌌

[![CI Pipeline](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml)
[![Release](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml)

> A modern, highly customizable dashboard with a neon aesthetic, video backgrounds, and robust app integration.

## 🚀 Features

- **Neon/Dark Theme**: Stunning visual design with glassmorphism and neon accents.
- **Dynamic Backgrounds**: Support for video and image backgrounds.
- **App Store**: Built-in library of popular apps with **Search** and **Alphabetical Sorting**.
- **App Integration**: Add and customize apps, including API-connected widgets.
- **Production Ready**: Built with DDD, FastAPI, and React + Vite.
- **Secure**: Strict security practices (Helmet, CORS, Rate Limiting).
- **PWA Ready**: Installable as an app on Android, iOS, and Desktop (Chrome/Edge).

## 🛠 Tech Stack

- **Backend**: Python 3.11, FastAPI, Pydantic, SQLAlchemy.
- **Frontend**: React 18, Vite, TailwindCSS, Framer Motion.
- **DevOps**: Docker, GitHub Actions, Renovate.

## 🏁 Getting Started

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.11+

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/er-startseite.git
   cd er-startseite
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the Application**
   - Frontend: `http://localhost:13001`
   - Backend API: `http://localhost:13000/docs`

## 🐳 Deployment (Production)

To deploy using the pre-built images from GitHub Container Registry (recommended for Portainer/Production):

1. **Create a `docker-compose.yml` file**:
   ```yaml
   version: '3.8'

   services:
     backend:
       image: ghcr.io/eidolf/er-startseite/backend:latest
       restart: unless-stopped
       ports:
         - "13000:13000"
       environment:
         - PROJECT_NAME=ER-Startseite
         - SECRET_KEY=changeme_in_production # ⚠️ CHANGE THIS
         - BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000", "http://localhost:13001"]
         - POSTGRES_SERVER=db
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres # ⚠️ CHANGE THIS
         - POSTGRES_DB=er_startseite
       depends_on:
         - db
       volumes:
         - ./data/uploads:/app/uploads
         - ./data/app_data:/app/data

     frontend:
       image: ghcr.io/eidolf/er-startseite/frontend:latest
       restart: unless-stopped
       ports:
         - "13001:80"
       depends_on:
         - backend

     db:
       image: postgres:15-alpine
       restart: unless-stopped
       environment:
         - POSTGRES_USER=postgres
         - POSTGRES_PASSWORD=postgres # ⚠️ CHANGE THIS
         - POSTGRES_DB=er_startseite
       volumes:
         - ./data/postgres:/var/lib/postgresql/data
   ```

2. **Start the stack**:
   ```bash
   docker-compose up -d
   ```

### ⚠️ Troubleshooting: "Set Password" Flickers / Fail
If you click "Set Password" and it just flickers or does nothing (but works locally):
1.  **Check CORS**: If you access the site via IP (e.g., `http://192.168.1.50:13001`), the backend might block the request because it only trusts `localhost` by default.
    - **Fix**: Add your IP to the environment variable in `docker-compose.prod.yml`:
      ```yaml
      - BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://YOUR_SERVER_IP:13001"]
      ```
2.  **Check Permissions**: The backend tries to save the password to `data/app_data/auth.json`. If the folder permissions on your host are wrong (e.g. owned by root), it fails.
    - **Fix**: Check logs (`docker logs er-startseite-backend-1`). If you see "Permission denied", fix folder ownership: `chown -R 1001:1001 ./data`.

### ⚠️ Troubleshooting: "Unauthorized" / "Pull Access Denied"
If you get an error pulling images from **Portainer** or **Docker**, it's likely because the package is **Private** by default on GitHub.

**Solution:**
1. Go to your GitHub Repository -> main page.
2. Look for the **"Packages"** section (sidebar) -> Click on the package (e.g., `backend`).
3. Click **"Package Settings"** (right sidebar).
4. Scroll to **"Danger Zone"** -> **"Change visibility"**.
5. Switch it to **Public**.
6. Repeat for the `frontend` package.



## 🌍 Custom App Registries

You can extend the App Store by adding your own custom registries. A registry is simply a JSON file hosted on a URL that returns a list of app definitions.

### Example `custom_apps.json`
You can find a template in `custom_apps_example.json`:

```json
[
    {
        "id": "example-app",
        "name": "Example App",
        "description": "An example custom application for the App Store",
        "default_icon": "https://example.com/icon.png",
        "default_url": "https://example.com"
    },
    {
        "id": "another-app",
        "name": "Another App",
        "description": "Another custom application example",
        "default_icon": "https://example.com/other-icon.png",
        "default_url": "https://example.com/app"
    }
]
```

## 📦 Project Structure

```
ER-Startseite/
├── backend/          # FastAPI Backend (DDD)
│   ├── app/
│   │   ├── domain/   # Business Logic
│   │   ├── api/      # API Routes
│   │   └── core/     # Config & Security
├── frontend/         # React Frontend
│   ├── src/
│   │   ├── components/
│   │   └── lib/      # Utilities
└── .github/          # CI/CD Workflows
```

## 🛡 Security

- **Authentication**: Uses bcrypt hashing for passwords and secure HTTP-only cookies for session management.
- **Deployment**: Highly recommended to run behind a reverse proxy (e.g., Nginx, Traefik, Caddy) with SSL/TLS enabled.
- **Reporting**: This is a personal project. Please report vulnerabilities via GitHub Issues.

## 🤝 Contributing

Contributions are welcome!
1. Fork the project.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m 'Add some NewFeature'`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

## 📄 License

AGPL
