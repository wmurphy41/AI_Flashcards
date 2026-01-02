"""CLI for AI deck generation tools."""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from .storage import DeckStorage
from .validator import DeckValidator
from .generator import DeckGenerator


def _normalize_deck_id(filename_stem: str) -> str:
    """Normalize a deck ID to kebab-case."""
    import re
    normalized = filename_stem.lower()
    normalized = re.sub(r'[^a-z0-9-]', '-', normalized)
    normalized = re.sub(r'-+', '-', normalized)
    normalized = normalized.strip('-')
    return normalized


def _find_deck_file(storage: DeckStorage, deck_id_or_path: str) -> Optional[Path]:
    """
    Find a deck file by ID or path.
    
    Args:
        storage: DeckStorage instance
        deck_id_or_path: Either a deck ID or a path to a JSON file
        
    Returns:
        Path to the deck file, or None if not found
    """
    # Check if it's a direct path
    path = Path(deck_id_or_path)
    if path.is_file():
        return path
    
    # Try to find by ID in the decks directory
    normalized_id = _normalize_deck_id(path.stem if path.suffix else deck_id_or_path)
    for deck_file in storage.list_deck_files():
        if _normalize_deck_id(deck_file.stem) == normalized_id:
            return deck_file
    
    return None


def cmd_list(args):
    """List available decks."""
    storage = DeckStorage()
    deck_files = storage.list_deck_files()
    
    if not deck_files:
        print("No decks found.")
        return
    
    print(f"Found {len(deck_files)} deck(s):\n")
    for deck_file in deck_files:
        deck_id = _normalize_deck_id(deck_file.stem)
        try:
            deck_data = storage.load_deck(deck_file)
            title = deck_data.get('title', 'Untitled')
            card_count = len(deck_data.get('cards', []))
            print(f"  {deck_id}: {title} ({card_count} cards)")
        except Exception as e:
            print(f"  {deck_id}: Error loading deck - {e}")


def cmd_preview(args):
    """Preview a deck."""
    storage = DeckStorage()
    deck_file = _find_deck_file(storage, args.deck_id_or_path)
    
    if deck_file is None:
        print(f"Error: Deck '{args.deck_id_or_path}' not found.", file=sys.stderr)
        sys.exit(1)
    
    try:
        deck_data = storage.load_deck(deck_file)
        deck_id = _normalize_deck_id(deck_file.stem)
        title = deck_data.get('title', 'Untitled')
        description = deck_data.get('description', '')
        cards = deck_data.get('cards', [])
        
        print(f"Deck ID: {deck_id}")
        print(f"Title: {title}")
        if description:
            print(f"Description: {description}")
        print(f"Card count: {len(cards)}")
        
        if cards:
            print("\nFirst 3 cards:")
            for i, card in enumerate(cards[:3], 1):
                front = card.get('front', '')
                print(f"  {i}. {front}")
        else:
            print("\nNo cards in this deck.")
            
    except Exception as e:
        print(f"Error: Failed to load deck - {e}", file=sys.stderr)
        sys.exit(1)


def cmd_validate(args):
    """Validate a deck file."""
    from .storage import DeckStorage
    
    validator = DeckValidator()
    storage = DeckStorage()
    
    # Check if input is a deck ID (no .json extension) or a path
    deck_path = args.path
    path_obj = Path(deck_path)
    
    if not path_obj.suffix == '.json':
        # Try to find by deck ID
        deck_file = _find_deck_file(storage, deck_path)
        if deck_file is None:
            print(f"Error: Deck '{deck_path}' not found.", file=sys.stderr)
            sys.exit(1)
        deck_path = str(deck_file)
    
    normalized, warnings, errors = validator.validate_and_repair_file(deck_path)
    
    if normalized is None or errors:
        print("INVALID")
        if normalized is None:
            # File loading failed, errors already set
            pass
        else:
            print("\nErrors:")
            for error in errors:
                print(f"  - {error}")
        sys.exit(1)
    
    # Validation succeeded
    print("VALID")
    print(f"Deck ID: {normalized['id']}")
    print(f"Title: {normalized['title']}")
    print(f"Card count: {len(normalized['cards'])}")
    
    if warnings:
        print("\nWARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")


def cmd_generate(args):
    """Generate a deck from a description."""
    from .generator import DeckGenerator
    from .storage import DeckStorage
    
    try:
        generator = DeckGenerator()
        deck_data = generator.generate(args.description)
        
        # Persist to disk
        storage = DeckStorage()
        file_path = storage.write_deck(deck_data)
        
        # Print success information
        print("DECK CREATED")
        print(f"Deck ID: {deck_data['id']}")
        print(f"File path: {file_path}")
        print(f"Card count: {len(deck_data['cards'])}")
        
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except OSError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: Unexpected error during generation: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="AI Flashcard Deck Generation Tools",
        prog="python -m backend.ai_deckgen.cli"
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # list command
    subparsers.add_parser('list', help='List available decks')
    
    # preview command
    preview_parser = subparsers.add_parser('preview', help='Preview a deck')
    preview_parser.add_argument('deck_id_or_path', help='Deck ID or path to deck file')
    
    # validate command
    validate_parser = subparsers.add_parser('validate', help='Validate a deck file')
    validate_parser.add_argument('path', help='Path to deck JSON file')
    
    # generate command
    generate_parser = subparsers.add_parser('generate', help='Generate a deck from description')
    generate_parser.add_argument('description', help='Description of the desired deck')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to command handler
    if args.command == 'list':
        cmd_list(args)
    elif args.command == 'preview':
        cmd_preview(args)
    elif args.command == 'validate':
        cmd_validate(args)
    elif args.command == 'generate':
        cmd_generate(args)


if __name__ == '__main__':
    main()

