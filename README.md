# ER-Startseite 🌌

[![CI Pipeline](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml)
[![Release](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml)

> A modern, highly customizable dashboard with a neon aesthetic, video backgrounds, and robust app integration.

## 🚀 Features

- **Neon/Dark Theme**: Stunning visual design with glassmorphism and neon accents.
- **Dynamic Backgrounds**: Support for video and image backgrounds.
- **App Integration**: Add and customize apps, including API-connected widgets.
- **Production Ready**: Built with DDD, FastAPI, and React + Vite.
- **Secure**: Strict security practices (Helmet, CORS, Rate Limiting).

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

### ⚠️ Troubleshooting: "Unauthorized" / "Pull Access Denied"
If you get an error pulling images from **Portainer** or **Docker**, it's likely because the package is **Private** by default on GitHub.

**Solution:**
1. Go to your GitHub Repository -> main page.
2. Look for the **"Packages"** section (sidebar) -> Click on the package (e.g., `backend`).
3. Click **"Package Settings"** (right sidebar).
4. Scroll to **"Danger Zone"** -> **"Change visibility"**.
5. Switch it to **Public**.
6. Repeat for the `frontend` package.


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
