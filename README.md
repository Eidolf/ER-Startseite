# ER-Startseite 🌌

[![CI Pipeline](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/ci-orchestrator.yml)
[![Release](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml/badge.svg)](https://github.com/Eidolf/ER-Startseite/actions/workflows/release.yml)

> A modern, highly customizable dashboard with a neon aesthetic, video backgrounds, and robust app integration.

![Logo](images/logo.png) (Placeholder)

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

See `SECURITY.md` (To be created) for reporting vulnerabilities.

## 🤝 Contributing

See `CONTRIBUTING.md` (To be created) for guidelines.

## 📄 License

MIT
