from pydantic import BaseModel, Field
from typing import Optional


class Card(BaseModel):
    id: str = Field(..., description="Unique card ID within the deck")
    front: str = Field(..., description="Front side of the card")
    back: str = Field(..., description="Back side of the card")
    uid: Optional[str] = Field(None, description="Globally unique card identifier (deckId:cardId)")


class Deck(BaseModel):
    id: str = Field(..., description="Unique deck ID (must match filename stem)")
    title: str = Field(..., description="Deck title")
    description: Optional[str] = Field(None, description="Deck description")
    prompt: Optional[str] = Field(None, description="User prompt/description used to generate this deck")
    cards: list[Card] = Field(..., description="List of cards in the deck")


class DeckSummary(BaseModel):
    id: str = Field(..., description="Unique deck ID")
    title: str = Field(..., description="Deck title")
    description: Optional[str] = Field(None, description="Deck description")
    card_count: int = Field(..., description="Number of cards in the deck")

