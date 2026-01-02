"""Deck storage utilities for reading and writing deck files."""

import json
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple
import os


class DeckStorage:
    """Handles reading and writing deck files."""
    
    def __init__(self, decks_dir: Optional[Path] = None):
        """
        Initialize DeckStorage.
        
        Args:
            decks_dir: Path to decks directory. If None, uses default location.
        """
        if decks_dir is None:
            # Default to backend/app/content/decks
            self.decks_dir = self._get_default_decks_directory()
        else:
            self.decks_dir = Path(decks_dir)
    
    def _get_default_decks_directory(self) -> Path:
        """Get the default decks directory path."""
        # This file is at backend/ai_deckgen/storage.py
        # Default decks are at backend/app/content/decks
        current_file = Path(__file__).resolve()
        backend_dir = current_file.parent.parent  # Go up to backend/
        return backend_dir / "app" / "content" / "decks"
    
    def list_deck_files(self) -> List[Path]:
        """
        List all JSON deck files in the decks directory.
        
        Returns:
            List of Path objects for each JSON file
        """
        if not self.decks_dir.exists():
            return []
        
        return sorted(self.decks_dir.glob("*.json"))
    
    def load_deck(self, deck_path: Path) -> dict:
        """
        Load a deck from a JSON file.
        
        Args:
            deck_path: Path to the deck JSON file
            
        Returns:
            Dictionary containing the deck data
        """
        with open(deck_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def save_deck(self, deck_data: dict, deck_path: Path) -> None:
        """
        Save a deck to a JSON file.
        
        Args:
            deck_data: Dictionary containing the deck data
            deck_path: Path where the deck should be saved
        """
        deck_path.parent.mkdir(parents=True, exist_ok=True)
        with open(deck_path, 'w', encoding='utf-8') as f:
            json.dump(deck_data, f, indent=2, ensure_ascii=False)
    
    def _resolve_collision_safe_path(self, base_deck_id: str) -> Tuple[Path, str]:
        """
        Resolve a collision-safe file path and deck ID.
        
        Args:
            base_deck_id: Base deck ID (without suffix)
            
        Returns:
            Tuple of (file_path, resolved_deck_id)
        """
        # Ensure directory exists
        self.decks_dir.mkdir(parents=True, exist_ok=True)
        
        # Try base ID first
        base_path = self.decks_dir / f"{base_deck_id}.json"
        if not base_path.exists():
            return base_path, base_deck_id
        
        # Try with suffixes -2, -3, etc.
        suffix = 2
        while True:
            resolved_id = f"{base_deck_id}-{suffix}"
            resolved_path = self.decks_dir / f"{resolved_id}.json"
            if not resolved_path.exists():
                return resolved_path, resolved_id
            suffix += 1
    
    def write_deck(self, deck: dict) -> Path:
        """
        Write a deck to disk with collision-safe ID resolution.
        
        Args:
            deck: Dictionary containing the deck data (will be modified to update 'id')
            
        Returns:
            Path to the written file
            
        Raises:
            OSError: If file write fails
        """
        base_deck_id = deck.get('id', 'unknown-deck')
        
        # Resolve collision-safe path and ID
        file_path, resolved_id = self._resolve_collision_safe_path(base_deck_id)
        
        # Update deck ID to match resolved filename
        deck['id'] = resolved_id
        
        # Ensure directory exists
        self.decks_dir.mkdir(parents=True, exist_ok=True)
        
        # Write atomically using temp file + rename
        try:
            # Create temp file in the same directory
            temp_fd, temp_path = tempfile.mkstemp(
                suffix='.json',
                dir=self.decks_dir,
                prefix='.deck-',
                text=True
            )
            
            try:
                # Write JSON to temp file
                with os.fdopen(temp_fd, 'w', encoding='utf-8') as f:
                    json.dump(deck, f, indent=2, ensure_ascii=False)
                
                # Atomic rename
                os.replace(temp_path, file_path)
                
            except Exception:
                # Clean up temp file on error
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
                raise
        
        except OSError as e:
            raise OSError(f"Failed to write deck file: {e}")
        
        return file_path
