from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .content_loader import list_decks, get_deck
from .schemas import DeckSummary, Deck

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/decks", response_model=list[DeckSummary])
async def get_decks():
    """List all available decks with summaries."""
    return list_decks()


@app.get("/api/decks/{deck_id}", response_model=Deck)
async def get_deck_by_id(deck_id: str):
    """Get full deck details including all cards."""
    try:
        return get_deck(deck_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Deck not found")

