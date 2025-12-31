import json
from pathlib import Path
from typing import List
from .schemas import Deck, DeckSummary


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
    
    # Validate the deck
    deck = Deck(**data)
    
    # Ensure deck.id matches filename stem
    expected_id = file_path.stem
    if deck.id != expected_id:
        raise ValueError(
            f"Deck ID '{deck.id}' does not match filename stem '{expected_id}'"
        )
    
    # Ensure card IDs are unique within the deck
    card_ids = [card.id for card in deck.cards]
    if len(card_ids) != len(set(card_ids)):
        duplicates = [cid for cid in card_ids if card_ids.count(cid) > 1]
        raise ValueError(
            f"Duplicate card IDs found in deck '{deck.id}': {set(duplicates)}"
        )
    
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
    """Load a specific deck by ID."""
    decks_dir = _get_decks_directory()
    deck_file = decks_dir / f"{deck_id}.json"
    
    if not deck_file.exists():
        raise FileNotFoundError(f"Deck '{deck_id}' not found")
    
    return _load_deck_from_file(deck_file)

