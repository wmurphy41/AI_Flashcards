"""Service layer for AI deck generation."""

from pathlib import Path
from typing import Tuple

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

