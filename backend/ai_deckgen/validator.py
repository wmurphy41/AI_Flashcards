"""Deck validation utilities."""

import json
import re
from datetime import date
from pathlib import Path
from typing import Optional, Tuple


class DeckValidator:
    """Validates deck data against the schema."""
    
    # Field length constants
    MAX_TITLE_LENGTH = 80
    MAX_DESCRIPTION_LENGTH = 120
    MAX_FRONT_LENGTH = 120
    MAX_BACK_LENGTH = 120
    MAX_CARDS = 50
    
    # Allowed character pattern (Unicode letters, numbers, whitespace, basic punctuation)
    # Includes: letters (including accents), combining marks, numbers, whitespace
    # Basic punctuation: . , ; : ! ? ' " ( ) [ ] { } - – — / \ + & % @ # *
    ALLOWED_CHAR_PATTERN = re.compile(
        r'[\w\s.,;:!?\'"\(\)\[\]\{\}\-–—/\\+&%@#*]',
        re.UNICODE
    )
    
    def __init__(self):
        """Initialize DeckValidator."""
        pass
    
    def validate(self, deck_data: dict) -> Tuple[bool, list[str]]:
        """
        Validate deck data (deprecated - use validate_and_repair instead).
        
        Args:
            deck_data: Dictionary containing the deck data to validate
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        normalized, warnings, errors = self.validate_and_repair(deck_data)
        return len(errors) == 0, errors
    
    def validate_file(self, deck_path: str) -> Tuple[bool, list[str]]:
        """
        Validate a deck file (deprecated - use validate_and_repair_file instead).
        
        Args:
            deck_path: Path to the deck JSON file
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        normalized, warnings, errors = self.validate_and_repair_file(deck_path)
        return len(errors) == 0, errors
    
    def validate_and_repair_file(self, deck_path: str) -> Tuple[Optional[dict], list[str], list[str]]:
        """
        Load, validate, and repair a deck file.
        
        Args:
            deck_path: Path to the deck JSON file
            
        Returns:
            Tuple of (normalized_deck_dict, warnings, errors)
            Returns (None, [], errors) if file cannot be loaded
        """
        try:
            path = Path(deck_path)
            with open(path, 'r', encoding='utf-8') as f:
                deck_data = json.load(f)
        except json.JSONDecodeError as e:
            return None, [], [f"Invalid JSON: {e}"]
        except Exception as e:
            return None, [], [f"Failed to load file: {e}"]
        
        return self.validate_and_repair(deck_data)
    
    def validate_and_repair(self, deck_data: dict) -> Tuple[dict, list[str], list[str]]:
        """
        Validate and repair deck data.
        
        Args:
            deck_data: Dictionary containing the deck data to validate
            
        Returns:
            Tuple of (normalized_deck_dict, warnings, errors)
        """
        warnings = []
        errors = []
        normalized = deck_data.copy()
        
        # 1) Check required top-level keys (repairable vs non-repairable)
        # Non-repairable keys (must exist)
        required_non_repairable = ['id', 'title', 'cards']
        missing_non_repairable = [key for key in required_non_repairable if key not in normalized]
        
        if missing_non_repairable:
            errors.append(f"Missing required keys: {', '.join(missing_non_repairable)}")
            if 'id' not in normalized or 'title' not in normalized:
                return normalized, warnings, errors
            if 'cards' not in normalized:
                normalized['cards'] = []
        
        # Repairable keys (add defaults with warnings)
        if 'description' not in normalized:
            normalized['description'] = ''
        
        if 'source' not in normalized or not normalized.get('source'):
            normalized['source'] = 'unknown'
            warnings.append("Missing or empty 'source' field, set to 'unknown'")
        
        if 'generated_at' not in normalized:
            normalized['generated_at'] = date.today().isoformat()
            warnings.append(f"Missing 'generated_at' field, set to {normalized['generated_at']}")
        
        # 2) Validate cards is a list
        if not isinstance(normalized['cards'], list):
            errors.append("'cards' must be a list")
            return normalized, warnings, errors
        
        # 3) Check cards is non-empty
        if len(normalized['cards']) == 0:
            errors.append("'cards' must be a non-empty list")
            return normalized, warnings, errors
        
        # 4) Truncate to max 50 cards if needed
        if len(normalized['cards']) > self.MAX_CARDS:
            normalized['cards'] = normalized['cards'][:self.MAX_CARDS]
            warnings.append(f"Truncated cards to {self.MAX_CARDS} (was {len(deck_data['cards'])})")
        
        # 5) Validate and repair field lengths
        if len(normalized['title']) > self.MAX_TITLE_LENGTH:
            normalized['title'] = normalized['title'][:self.MAX_TITLE_LENGTH]
            warnings.append(f"Truncated 'title' to {self.MAX_TITLE_LENGTH} characters")
        
        if len(normalized.get('description', '')) > self.MAX_DESCRIPTION_LENGTH:
            normalized['description'] = normalized['description'][:self.MAX_DESCRIPTION_LENGTH]
            warnings.append(f"Truncated 'description' to {self.MAX_DESCRIPTION_LENGTH} characters")
        
        # 6) Validate source is non-empty
        if not normalized.get('source') or not normalized['source'].strip():
            normalized['source'] = 'unknown'
            warnings.append("Empty 'source' field, set to 'unknown'")
        
        # 10) Validate generated_at format
        generated_at = normalized.get('generated_at', '')
        if not generated_at:
            normalized['generated_at'] = date.today().isoformat()
            warnings.append(f"Missing 'generated_at', set to {normalized['generated_at']}")
        else:
            try:
                date.fromisoformat(generated_at)
            except (ValueError, TypeError):
                normalized['generated_at'] = date.today().isoformat()
                warnings.append(f"Invalid 'generated_at' format, set to {normalized['generated_at']}")
        
        # Process and validate cards
        cleaned_cards = []
        seen_ids = set()
        
        for idx, card in enumerate(normalized['cards'], start=1):
            if not isinstance(card, dict):
                errors.append(f"Card {idx} is not a dictionary")
                continue
            
            # Check required card fields
            if 'id' not in card or 'front' not in card or 'back' not in card:
                errors.append(f"Card {idx} missing required fields (id, front, or back)")
                continue
            
            card_id = card.get('id', '').strip()
            front = card.get('front', '').strip()
            back = card.get('back', '').strip()
            
            # Clean characters (7)
            front_cleaned = self._clean_text(front)
            back_cleaned = self._clean_text(back)
            
            # Reject empty after cleaning
            if not front_cleaned:
                errors.append(f"Card {idx} has empty 'front' after cleaning")
                continue
            if not back_cleaned:
                errors.append(f"Card {idx} has empty 'back' after cleaning")
                continue
            
            # Truncate field lengths
            if len(front_cleaned) > self.MAX_FRONT_LENGTH:
                front_cleaned = front_cleaned[:self.MAX_FRONT_LENGTH]
                warnings.append(f"Card {idx} 'front' truncated to {self.MAX_FRONT_LENGTH} characters")
            
            if len(back_cleaned) > self.MAX_BACK_LENGTH:
                back_cleaned = back_cleaned[:self.MAX_BACK_LENGTH]
                warnings.append(f"Card {idx} 'back' truncated to {self.MAX_BACK_LENGTH} characters")
            
            # Track duplicate IDs (8) - will reassign sequentially
            cleaned_card = {
                'id': card_id,
                'front': front_cleaned,
                'back': back_cleaned
            }
            cleaned_cards.append(cleaned_card)
        
        # 9) Ensure sequential card IDs (c1..cN) and handle duplicates
        if len(cleaned_cards) != len(normalized['cards']):
            # Some cards were dropped, need to reassign IDs
            for i, card in enumerate(cleaned_cards, start=1):
                expected_id = f"c{i}"
                if card['id'] != expected_id:
                    warnings.append(f"Card {i} ID changed from '{card['id']}' to '{expected_id}'")
                    card['id'] = expected_id
        else:
            # Check for duplicates and non-sequential IDs
            for i, card in enumerate(cleaned_cards, start=1):
                expected_id = f"c{i}"
                if card['id'] in seen_ids or card['id'] != expected_id:
                    if card['id'] != expected_id:
                        warnings.append(f"Card {i} ID changed from '{card['id']}' to '{expected_id}'")
                    card['id'] = expected_id
                seen_ids.add(card['id'])
        
        # Update normalized deck with cleaned cards
        normalized['cards'] = cleaned_cards
        
        # Final check: must have at least one valid card
        if len(normalized['cards']) == 0:
            errors.append("No valid cards after validation and repair")
        
        return normalized, warnings, errors
    
    def _clean_text(self, text: str) -> str:
        """
        Clean text by removing disallowed characters.
        
        Args:
            text: Input text to clean
            
        Returns:
            Cleaned text
        """
        if not text:
            return ''
        
        # Filter characters using allowed pattern
        cleaned = ''.join(char if self.ALLOWED_CHAR_PATTERN.match(char) else ' ' for char in text)
        # Collapse multiple spaces into single space
        cleaned = re.sub(r'\s+', ' ', cleaned)
        # Strip leading/trailing whitespace
        cleaned = cleaned.strip()
        
        return cleaned
