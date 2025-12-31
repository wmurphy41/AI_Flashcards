# AI Flashcards

A monorepo web application with FastAPI backend and React+TypeScript frontend.

## Phase 1 Overview

Phase 1 is a **stateless prototype** with the following characteristics:

- **No database**: Decks are served from static JSON files
- **No authentication**: Open access to all decks
- **No persistence**: Study session progress is not saved
- **Mobile-first UI**: Optimized for touch interactions on mobile devices
- **4-cycle study system**: Study cards up to 4 times, focusing on incorrect answers

### Features

- **Deck Management**: Browse available flashcard decks
- **Study Sessions**: 
  - Tap cards to flip between front and back
  - Swipe right for correct, swipe left for incorrect
  - Up to 4 cycles of study (cycles 2-4 only show cards you got wrong)
  - Session ends early if all cards are correct
- **Results**: View Cycle 1 score and session statistics

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

## API Endpoints

All endpoints are prefixed with `/api`.

### Health Check
```powershell
curl http://localhost:8000/api/health
```

Returns: `{"status":"ok"}`

### List All Decks
```powershell
curl http://localhost:8000/api/decks
```

Returns a JSON array of deck summaries:
```json
[
  {
    "id": "spanish-basics",
    "title": "Spanish Basics",
    "description": "Common greetings and phrases",
    "card_count": 5
  }
]
```

### Get Deck Details
```powershell
curl http://localhost:8000/api/decks/spanish-basics
```

Returns full deck details including all cards:
```json
{
  "id": "spanish-basics",
  "title": "Spanish Basics",
  "description": "Common greetings and phrases",
  "cards": [
    { "id": "c1", "front": "hola", "back": "hello" },
    { "id": "c2", "front": "adiós", "back": "goodbye" }
  ]
}
```

Returns 404 with `{"detail":"Deck not found"}` if deck doesn't exist.

## Flashcard Decks

### Deck JSON Schema

Deck JSON files are located in `backend/app/content/decks/`. Each deck file must:

- Have a `.json` extension
- Have `deck.id` matching the filename stem (e.g., `spanish-basics.json` → `id: "spanish-basics"`)
- Have unique `card.id` values within each deck
- Follow this schema:

```json
{
  "id": "deck-id-must-match-filename",
  "title": "Deck Title",
  "description": "Optional description",
  "cards": [
    {
      "id": "unique-card-id",
      "front": "Front side text",
      "back": "Back side text"
    }
  ]
}
```

**Required fields:**
- `id` (string): Must match filename without `.json` extension
- `title` (string): Display name for the deck
- `cards` (array): Array of card objects

**Optional fields:**
- `description` (string): Brief description of the deck

**Card object:**
- `id` (string): Unique identifier within the deck
- `front` (string): Text shown on the front of the card
- `back` (string): Text shown on the back of the card

### Adding a New Deck

1. Create a new JSON file in `backend/app/content/decks/`
2. Name it with a descriptive ID (e.g., `french-verbs.json`)
3. Set the `id` field to match the filename (without `.json`)
4. Add your cards following the schema above
5. Restart the backend service (or it will auto-reload if running with `--reload`)

Example: `backend/app/content/decks/french-verbs.json`
```json
{
  "id": "french-verbs",
  "title": "French Verbs",
  "description": "Common French verb conjugations",
  "cards": [
    { "id": "v1", "front": "être (to be)", "back": "je suis, tu es, il/elle est" },
    { "id": "v2", "front": "avoir (to have)", "back": "j'ai, tu as, il/elle a" }
  ]
}
```

The deck will automatically appear in the deck list after the backend reloads.

## Project Structure

```
/
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── content/
│   │   │   └── decks/    # Deck JSON files
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── content_loader.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # Vite React+TypeScript application
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

