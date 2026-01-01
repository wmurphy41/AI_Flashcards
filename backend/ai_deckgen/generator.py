"""AI deck generation utilities."""

from typing import Optional


class DeckGenerator:
    """Generates flashcard decks using AI."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize DeckGenerator.
        
        Args:
            api_key: OpenAI API key. If None, must be provided via environment variable.
        """
        self.api_key = api_key
        # Stub - not implemented yet
    
    def generate(self, description: str, card_count: int = 15) -> dict:
        """
        Generate a deck from a description.
        
        Args:
            description: User description of the desired deck
            card_count: Number of cards to generate (default 15, max 50)
            
        Returns:
            Dictionary containing the generated deck data
        """
        # Stub implementation - not implemented yet
        raise NotImplementedError("Deck generation not implemented yet")

