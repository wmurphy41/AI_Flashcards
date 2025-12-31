# AI Flashcards

A monorepo web application with FastAPI backend and React+TypeScript frontend.

## Quick Start

### Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- Windows: Ensure Docker Desktop is running

### Running with Docker Compose

```powershell
docker compose up --build
```

This will start both services:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000

### Ports

- Frontend: `5173` (Vite dev server)
- Backend: `8000` (FastAPI)

### Proxy Configuration

- **Docker Compose**: The frontend service uses `VITE_API_PROXY_TARGET=http://backend:8000` to communicate with the backend via Docker service name resolution.
- **Local Development**: When running the frontend locally (outside Docker), it defaults to `http://localhost:8000` for the proxy target.

## Running Locally (Without Docker)

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Troubleshooting

### Docker Desktop Not Running

Ensure Docker Desktop is running before executing `docker compose up`. On Windows, check the system tray for the Docker icon.

### Port Conflicts

If ports 8000 or 5173 are already in use:

1. Stop the conflicting service, or
2. Modify the port mappings in `docker-compose.yml` (e.g., `"8001:8000"` for backend)

### Windows PowerShell Execution Policy

If you encounter execution policy errors, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Project Structure

```
/
├── backend/          # FastAPI application
│   ├── app/
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # Vite React+TypeScript application
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

