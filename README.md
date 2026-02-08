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
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
cd backend
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

## Deployment Examples

Example configuration files for deploying the application to different environments are located in the `examples/` folder. These files include detailed comments explaining each configuration option.

### Available Example Files

- **[`examples/docker-compose.prod.example.yml`](examples/docker-compose.prod.example.yml)** - Production Docker Compose configuration for AWS deployment
  - Uses pre-built images from GitHub Container Registry (GHCR)
  - Includes health checks and restart policies
  - Configured for reverse proxy setup with nginx

- **[`examples/env.example`](examples/env.example)** - Environment variables template
  - OpenAI API key configuration
  - Frontend build variables (VITE_BASE_PATH, VITE_API_BASE)
  - Examples for both root and subdirectory deployments
  - Copy to `.env` and fill in your actual values

- **[`examples/nginx-container.conf.example`](examples/nginx-container.conf.example)** - Nginx configuration for the frontend Docker container
  - SPA routing configuration (try_files)
  - API proxy to backend container
  - Gzip compression settings
  - Used inside the production frontend container

- **[`examples/nginx-server.conf.example`](examples/nginx-server.conf.example)** - Server-level nginx configuration for production
  - Reverse proxy configuration for AWS EC2/Ubuntu servers
  - SSL/TLS configuration with Let's Encrypt
  - Security headers
  - Examples for root domain and subdirectory deployments
  - Sits outside Docker and proxies to containers

### Production Deployment Workflow

1. **Prepare environment variables:**
   ```bash
   cp examples/env.example .env
   # Edit .env with your actual values
   chmod 600 .env
   ```

2. **Set up Docker Compose:**
   ```bash
   cp examples/docker-compose.prod.example.yml docker-compose.prod.yml
   # Edit docker-compose.prod.yml if needed (update image tags, etc.)
   ```

3. **Configure server-level nginx:**
   ```bash
   # Copy and customize the server nginx config
   sudo cp examples/nginx-server.conf.example /etc/nginx/sites-available/ai-flashcards
   sudo nano /etc/nginx/sites-available/ai-flashcards
   # Update domain name, SSL certificate paths, etc.
   sudo ln -s /etc/nginx/sites-available/ai-flashcards /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **Start services:**
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Verify deployment:**
   ```bash
   docker ps
   curl http://localhost:8000/api/health
   ```

For detailed instructions, see the comments in each example file.

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
    { "id": "c1", "uid": "spanish-basics:c1", "front": "hola", "back": "hello" },
    { "id": "c2", "uid": "spanish-basics:c2", "front": "adiós", "back": "goodbye" }
  ]
}
```

**Notes:**
- All deck IDs in responses are normalized to kebab-case (lowercase, letters/numbers/hyphens only)
- Each card includes a `uid` field: a globally unique identifier in the format `<deckId>:<cardId>`
- The `uid` is computed by the backend and not stored in JSON files
- Requesting a deck with a non-normalized ID (e.g., `Spanish_Basics`) will still resolve correctly

Returns 404 with `{"detail":"Deck not found"}` if deck doesn't exist.

## AI Deck Generation

The `ai_deckgen` package provides command-line tools and API endpoints for generating flashcard decks using AI.

### Setup

1. Install dependencies (if not already installed):
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   ```

2. Set your OpenAI API key:

   **Local development:**
   ```powershell
   $env:OPENAI_API_KEY="sk-your-key-here"
   uvicorn app.main:app --reload
   ```

   **Docker Compose:**
   Add to `docker-compose.yml` under the `backend` service:
   ```yaml
   environment:
     - OPENAI_API_KEY=${OPENAI_API_KEY}
   ```
   
   Then set the variable before running:
   ```powershell
   $env:OPENAI_API_KEY="sk-your-key-here"
   docker compose up --build
   ```

### API Endpoint

**POST /api/ai/decks**

Generate a new deck using AI. The description input is limited to 2000 characters (truncated if longer). The generated deck's description field will be limited to 120 characters.

Request body:
```json
{
  "description": "Create a deck for Spanish irregular preterite verbs"
}
```

Response:
```json
{
  "deck": {
    "id": "spanish-irregular-preterite-verbs",
    "title": "Spanish Irregular Preterite Verbs",
    "description": "...",
    "source": "openai:gpt-4o-mini",
    "generated_at": "2026-01-01",
    "cards": [...]
  },
  "path": "spanish-irregular-preterite-verbs.json",
  "truncated": false
}
```

**Example with curl (bash/Unix):**
```bash
curl -X POST http://localhost:8000/api/ai/decks \
  -H "Content-Type: application/json" \
  -d '{"description":"Create a deck for Spanish irregular preterite verbs"}'
```

**Example with PowerShell:**
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/ai/decks -Method POST -ContentType "application/json" -Body '{"description":"Create a deck for Spanish irregular preterite verbs"}'
```

**Alternative: Use curl.exe in PowerShell:**
```powershell
curl.exe -X POST http://localhost:8000/api/ai/decks -H "Content-Type: application/json" -d "{\"description\":\"Create a deck for Spanish irregular preterite verbs\"}"
```

### CLI Usage

Run commands from the repository root:

```bash
# List available decks
python -m backend.ai_deckgen.cli list

# Preview a deck
python -m backend.ai_deckgen.cli preview <deck_id>
python -m backend.ai_deckgen.cli preview spanish-basics

# Validate a deck file
python -m backend.ai_deckgen.cli validate path/to/deck.json

# Generate a new deck (coming soon)
python -m backend.ai_deckgen.cli generate "Spanish vocabulary for restaurants"
```

### Package Structure

- `backend/ai_deckgen/cli.py` - CLI interface
- `backend/ai_deckgen/generator.py` - AI deck generation logic
- `backend/ai_deckgen/validator.py` - Deck validation
- `backend/ai_deckgen/storage.py` - File I/O operations
- `backend/ai_deckgen/prompts/` - Prompt templates

## Flashcard Decks

### Deck JSON Schema

Deck JSON files are located in `backend/app/content/decks/`. Each deck file must:

- Have a `.json` extension
- Have unique `card.id` values within each deck
- Follow this schema:

**Deck ID Normalization:**
- Deck IDs are automatically normalized to kebab-case (lowercase, letters/numbers/hyphens only) from the filename stem
- The `id` field in JSON files will be overridden with the normalized filename stem
- Example: `Spanish_Basics.json` → normalized ID: `spanish-basics`
- Example: `french-numbers.json` → normalized ID: `french-numbers`
- All API responses use normalized deck IDs

```json
{
  "id": "deck-id-will-be-normalized-from-filename",
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
- `id` (string): Will be normalized from filename stem (kebab-case)
- `title` (string): Display name for the deck
- `cards` (array): Array of card objects

**Optional fields:**
- `description` (string): Brief description of the deck

**Important:** The `id` field in JSON files will be overridden with the normalized filename stem. The `uid` field on cards is computed by the backend and does not need to be included in JSON files.

**Card object:**
- `id` (string): Unique identifier within the deck
- `uid` (string, computed): Globally unique identifier in format `<deckId>:<cardId>` (e.g., `spanish-basics:c1`)
  - Added automatically by the backend; not stored in JSON files
  - Ensures uniqueness across all decks
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
├── examples/          # Deployment configuration examples
│   ├── docker-compose.prod.example.yml
│   ├── env.example
│   ├── nginx-container.conf.example
│   └── nginx-server.conf.example
└── README.md
```

