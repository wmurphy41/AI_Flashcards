"""Service layer for AI deck generation."""

from pathlib import Path
from typing import Tuple, Dict

from .generator import DeckGenerator
from .storage import DeckStorage


def create_deck(description: str) -> Tuple[dict, Path]:
    """
    Orchestrate deck generation, validation, and persistence.
    
    Args:
        description: User description of the desired deck (should already be truncated to 120 chars)
        
    Returns:
        Tuple of (deck_dict, file_path)
        
    Raises:
        ValueError: If validation fails after repair
        RuntimeError: If OpenAI API call fails
        json.JSONDecodeError: If response is not valid JSON
        OSError: If file write fails
    """
    # Generate deck (description should already be truncated by caller)
    generator = DeckGenerator()
    deck_data = generator.generate(description)
    
    # Persist to disk
    storage = DeckStorage()
    file_path = storage.write_deck(deck_data)
    
    return deck_data, file_path


def regenerate_deck_cards(existing_deck_data: Dict, new_prompt: str) -> Dict:
    """
    Regenerate cards for an existing deck using a new prompt.
    
    Preserves deck metadata (id, title, description, source, generated_at, etc.)
    and replaces only the cards array.
    
    Args:
        existing_deck_data: Dictionary containing the existing deck data
        new_prompt: New prompt/description to use for card generation
        
    Returns:
        Dictionary containing the deck data with new cards
        
    Raises:
        ValueError: If validation fails after repair
        RuntimeError: If OpenAI API call fails
        json.JSONDecodeError: If response is not valid JSON
    """
    # Generate new deck with new prompt
    generator = DeckGenerator()
    new_deck_data = generator.generate(new_prompt)
    
    # Preserve existing deck metadata
    # Keep: id, title, description, source, generated_at, and any other custom fields
    # Replace: cards, prompt
    regenerated_deck = existing_deck_data.copy()
    regenerated_deck['cards'] = new_deck_data['cards']
    regenerated_deck['prompt'] = new_prompt
    
    # Note: title and description from new_deck_data are ignored
    # They should be updated separately via the update endpoint
    
    return regenerated_deck

