from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import sys
import tempfile
import os
from pathlib import Path

from .content_loader import list_decks, get_deck, resolve_deck_file_path, save_deck_order
from .schemas import DeckSummary, Deck

# Import ai_deckgen service
# Add backend directory to path to allow importing ai_deckgen
backend_dir = Path(__file__).parent.parent.resolve()
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from ai_deckgen.service import create_deck, regenerate_deck_cards

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


class DeckUpdateRequest(BaseModel):
    """Request model for deck updates."""
    title: str
    description: Optional[str] = None
    prompt: Optional[str] = None


class DeckOrderRequest(BaseModel):
    """Request model for deck order updates."""
    deck_ids: list[str]


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
    System decks (source="system") cannot be deleted and return 403.
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
    
    # Check if this is a system deck
    source = deck_data.get("source", "").strip()
    if source == "system":
        raise HTTPException(
            status_code=403,
            detail="Cannot delete system deck (source='system')"
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


@app.put("/api/decks/order")
async def update_deck_order(request: DeckOrderRequest):
    """
    Update the order of decks.
    
    Args:
        request: Request containing ordered list of deck IDs
        
    Returns:
        Success response
    """
    if not request.deck_ids:
        raise HTTPException(
            status_code=400,
            detail="deck_ids cannot be empty"
        )
    
    # Validate that all deck IDs exist by trying to resolve each one
    invalid_ids = []
    for deck_id in request.deck_ids:
        try:
            resolve_deck_file_path(deck_id)
        except FileNotFoundError:
            invalid_ids.append(deck_id)
    
    if invalid_ids:
        raise HTTPException(
            status_code=404,
            detail=f"Deck(s) not found: {', '.join(invalid_ids)}"
        )
    
    # Build order dict: {deck_id: index}
    order = {deck_id: index for index, deck_id in enumerate(request.deck_ids)}
    
    # Save order
    try:
        save_deck_order(order)
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save deck order: {str(e)}"
        )
    
    return {"status": "ok"}


@app.put("/api/decks/{deck_id}", response_model=Deck)
async def update_deck(deck_id: str, request: DeckUpdateRequest):
    """
    Update deck attributes (title, description, prompt).
    
    Preserves all other fields (id, cards, source, generated_at, etc.).
    """
    try:
        # Resolve the deck file path
        deck_file = resolve_deck_file_path(deck_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # Read existing deck JSON
    try:
        with open(deck_file, "r", encoding="utf-8") as f:
            deck_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to read deck file: {str(e)}"
        )
    
    # Validate title is not empty
    if not request.title or not request.title.strip():
        raise HTTPException(
            status_code=400,
            detail="Title cannot be empty"
        )
    
    # Store original values for rollback if regeneration fails
    original_prompt = deck_data.get('prompt')
    original_cards = deck_data.get('cards', []).copy()
    
    # Update title and description first
    deck_data['title'] = request.title.strip()
    
    if request.description is not None:
        deck_data['description'] = request.description.strip() if request.description else None
    else:
        # Preserve existing description if not provided
        pass
    
    # Check if prompt was edited
    prompt_edited = False
    if request.prompt is not None:
        new_prompt = request.prompt.strip() if request.prompt else None
        original_prompt_str = (original_prompt or '').strip()
        new_prompt_str = (new_prompt or '').strip()
        prompt_edited = new_prompt_str != original_prompt_str
        
        if prompt_edited:
            # Regenerate cards using new prompt
            try:
                # Truncate prompt to 2000 chars (same limit as generation endpoint)
                truncated_prompt = new_prompt_str[:2000] if new_prompt_str else ""
                
                # Regenerate cards while preserving deck metadata
                regenerated_deck = regenerate_deck_cards(deck_data, truncated_prompt)
                
                # Update deck_data with new cards and prompt
                deck_data['cards'] = regenerated_deck['cards']
                deck_data['prompt'] = truncated_prompt
                
            except ValueError as e:
                # Validation errors - restore original cards and prompt
                deck_data['cards'] = original_cards
                deck_data['prompt'] = original_prompt
                error_msg = str(e)
                if "Validation failed" in error_msg:
                    details = []
                    if "\n" in error_msg:
                        details = [line.strip() for line in error_msg.split("\n") if line.strip() and line.strip().startswith("-")]
                    raise HTTPException(
                        status_code=400,
                        detail={
                            "error": "Card regeneration failed: Validation error",
                            "details": details if details else [error_msg]
                        }
                    )
                raise HTTPException(status_code=400, detail={"error": f"Card regeneration failed: {error_msg}"})
                
            except (RuntimeError, json.JSONDecodeError) as e:
                # OpenAI API errors or JSON parsing errors - restore original cards and prompt
                deck_data['cards'] = original_cards
                deck_data['prompt'] = original_prompt
                error_msg = str(e)
                status_code = 502 if "OpenAI API" in error_msg or "API error" in error_msg else 502
                raise HTTPException(
                    status_code=status_code,
                    detail={
                        "error": f"Card regeneration failed: {error_msg}",
                        "details": []
                    }
                )
                
            except Exception as e:
                # Unexpected errors - restore original cards and prompt
                deck_data['cards'] = original_cards
                deck_data['prompt'] = original_prompt
                raise HTTPException(
                    status_code=500,
                    detail={
                        "error": f"Unexpected error during card regeneration: {str(e)}",
                        "details": []
                    }
                )
        else:
            # Prompt not changed, just update it normally
            deck_data['prompt'] = new_prompt
    else:
        # Preserve existing prompt if not provided
        pass
    
    # Write updated deck back to file using atomic write
    try:
        # Create temp file in the same directory
        temp_fd, temp_path = tempfile.mkstemp(
            suffix='.json',
            dir=deck_file.parent,
            prefix='.deck-',
            text=True
        )
        
        try:
            # Write JSON to temp file
            with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                json.dump(deck_data, f, indent=2, ensure_ascii=False)
            
            # Atomic rename
            os.replace(temp_path, deck_file)
        except Exception:
            # Clean up temp file on error
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            raise
    except OSError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to write deck file: {str(e)}"
        )
    
    # Return updated deck (load it back to ensure consistency)
    try:
        return get_deck(deck_id)
    except FileNotFoundError:
        # This shouldn't happen, but handle it gracefully
        raise HTTPException(
            status_code=500,
            detail="Deck updated but failed to reload"
        )


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

