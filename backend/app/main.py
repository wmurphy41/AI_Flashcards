from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import sys
from pathlib import Path

from .content_loader import list_decks, get_deck, resolve_deck_file_path
from .schemas import DeckSummary, Deck

# Import ai_deckgen service
# Add backend directory to path to allow importing ai_deckgen
backend_dir = Path(__file__).parent.parent.resolve()
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from ai_deckgen.service import create_deck

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DeckGenerationRequest(BaseModel):
    """Request model for deck generation."""
    description: str = ""


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


@app.delete("/api/decks/{deck_id}")
async def delete_deck(deck_id: str):
    """
    Delete a deck by ID.
    
    Only allows deletion of user-created (LLM-generated) decks.
    System decks (source="manual") cannot be deleted and return 403.
    """
    try:
        # Resolve the deck file path
        deck_file = resolve_deck_file_path(deck_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Read the deck JSON to check the source field
    try:
        with open(deck_file, "r", encoding="utf-8") as f:
            deck_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read deck file: {str(e)}"
        )
    
    # Check if this is a system/manual deck
    source = deck_data.get("source", "").strip()
    if source == "manual":
        raise HTTPException(
            status_code=403,
            detail="Cannot delete system deck (source='manual')"
        )
    
    # Delete the file
    try:
        deck_file.unlink()
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete deck file: {str(e)}"
        )
    
    # Return 204 No Content on success
    return Response(status_code=204)


@app.post("/api/ai/decks")
async def generate_deck(request: DeckGenerationRequest):
    """
    Generate a new deck using AI.
    
    Args:
        request: Request containing deck description
        
    Returns:
        JSON with deck data, file path, and truncation status
    """
    # Read description (default to empty string if missing/null)
    description = request.description or ""
    
    # Track if description was truncated (2000 char limit for input)
    original_length = len(description)
    truncated = original_length > 2000
    truncated_description = description[:2000] if description else ""
    
    try:
        # Call service layer
        deck_data, file_path = create_deck(truncated_description)
        
        # Convert Path to relative path string (from backend root)
        # file_path is something like: backend/app/content/decks/spanish-verbs.json
        # We want to return just the filename or relative path
        relative_path = file_path.relative_to(Path(__file__).parent.parent / "app" / "content" / "decks")
        path_str = str(relative_path)
        
        return {
            "deck": deck_data,
            "path": path_str,
            "truncated": truncated
        }
        
    except ValueError as e:
        # Validation errors that cannot be repaired
        error_msg = str(e)
        if "Validation failed" in error_msg:
            # Try to extract error list if it's formatted
            details = []
            if "\n" in error_msg:
                details = [line.strip() for line in error_msg.split("\n") if line.strip() and line.strip().startswith("-")]
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Validation failed after generation",
                    "details": details if details else [error_msg]
                }
            )
        raise HTTPException(status_code=400, detail={"error": error_msg})
        
    except (RuntimeError, OSError) as e:
        # OpenAI API errors or file write errors
        error_msg = str(e)
        status_code = 502 if "OpenAI API" in error_msg or "API error" in error_msg else 500
        raise HTTPException(
            status_code=status_code,
            detail={
                "error": error_msg,
                "details": []
            }
        )
        
    except json.JSONDecodeError as e:
        # JSON parsing errors
        raise HTTPException(
            status_code=502,
            detail={
                "error": f"Failed to parse JSON from AI response: {str(e)}",
                "details": []
            }
        )
        
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Unexpected error during deck generation: {str(e)}",
                "details": []
            }
        )

