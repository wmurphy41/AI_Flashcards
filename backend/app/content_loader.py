import json
import re
from pathlib import Path
from typing import List
from .schemas import Deck, DeckSummary, Card


def _normalize_deck_id(filename_stem: str) -> str:
    """
    Normalize a deck ID to kebab-case (lowercase, letters/numbers/hyphens only).
    
    Args:
        filename_stem: The filename stem to normalize
        
    Returns:
        Normalized deck ID in kebab-case
    """
    # Convert to lowercase
    normalized = filename_stem.lower()
    # Replace any non-alphanumeric characters (except hyphens) with hyphens
    normalized = re.sub(r'[^a-z0-9-]', '-', normalized)
    # Collapse multiple consecutive hyphens into a single hyphen
    normalized = re.sub(r'-+', '-', normalized)
    # Remove leading/trailing hyphens
    normalized = normalized.strip('-')
    return normalized


def _get_decks_directory() -> Path:
    """Get the decks directory path relative to this package."""
    # Get the directory where this module is located
    package_dir = Path(__file__).parent
    decks_dir = package_dir / "content" / "decks"
    return decks_dir


def _load_deck_from_file(file_path: Path) -> Deck:
    """Load and validate a single deck from a JSON file."""
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # Normalize deck ID from filename stem
    filename_stem = file_path.stem
    normalized_id = _normalize_deck_id(filename_stem)
    
    # Override deck.id with normalized version (silently)
    data["id"] = normalized_id
    
    # Ensure card IDs are unique within the deck (check before creating Deck)
    card_ids = [card.get("id") for card in data.get("cards", [])]
    if len(card_ids) != len(set(card_ids)):
        duplicates = [cid for cid in card_ids if card_ids.count(cid) > 1]
        raise ValueError(
            f"Duplicate card IDs found in deck '{normalized_id}': {set(duplicates)}"
        )
    
    # Create the deck with normalized ID
    deck = Deck(**data)
    
    # Add uid to each card (computed as deckId:cardId)
    cards_with_uid = []
    for card in deck.cards:
        card_dict = card.model_dump()
        card_dict["uid"] = f"{normalized_id}:{card.id}"
        cards_with_uid.append(Card(**card_dict))
    
    # Replace cards with cards that have uid
    deck.cards = cards_with_uid
    
    return deck


def list_decks() -> List[DeckSummary]:
    """Load all decks and return summaries."""
    decks_dir = _get_decks_directory()
    
    if not decks_dir.exists():
        return []
    
    summaries = []
    for json_file in decks_dir.glob("*.json"):
        try:
            deck = _load_deck_from_file(json_file)
            summaries.append(
                DeckSummary(
                    id=deck.id,
                    title=deck.title,
                    description=deck.description,
                    card_count=len(deck.cards),
                )
            )
        except Exception as e:
            # Log error but continue loading other decks
            print(f"Warning: Failed to load deck from {json_file}: {e}")
            continue
    
    return summaries


def get_deck(deck_id: str) -> Deck:
    """
    Load a specific deck by ID.
    
    Supports both normalized and non-normalized IDs.
    The requested ID is normalized before looking up the file.
    """
    decks_dir = _get_decks_directory()
    
    # Normalize the requested ID to match filename conventions
    normalized_id = _normalize_deck_id(deck_id)
    deck_file = decks_dir / f"{normalized_id}.json"
    
    if not deck_file.exists():
        raise FileNotFoundError(f"Deck '{deck_id}' not found")
    
    return _load_deck_from_file(deck_file)

