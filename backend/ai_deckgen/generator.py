"""AI deck generation utilities."""

import json
import os
from datetime import date
from pathlib import Path
from typing import Optional

from openai import OpenAI

from .validator import DeckValidator


class DeckGenerator:
    """Generates flashcard decks using AI."""
    
    MODEL_NAME = "gpt-4.1-mini"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize DeckGenerator.
        
        Args:
            api_key: OpenAI API key. If None, reads from OPENAI_API_KEY environment variable.
            
        Raises:
            ValueError: If API key is not provided and OPENAI_API_KEY is not set.
        """
        if api_key is None:
            api_key = os.getenv('OPENAI_API_KEY')
        
        if not api_key:
            raise ValueError(
                "OpenAI API key is required. "
                "Set OPENAI_API_KEY environment variable or pass api_key parameter."
            )
        
        self.api_key = api_key
        self.client = OpenAI(api_key=api_key)
        self.validator = DeckValidator()
    
    def _load_prompt_template(self) -> str:
        """Load the prompt template from prompts/deck_prompt.md."""
        current_file = Path(__file__).resolve()
        prompt_file = current_file.parent / "prompts" / "deck_prompt.md"
        
        with open(prompt_file, 'r', encoding='utf-8') as f:
            return f.read()
    
    def _build_prompt(self, description: str) -> str:
        """
        Build the full prompt by inserting user description into template.
        
        Args:
            description: User-provided deck description
            
        Returns:
            Complete prompt string
        """
        template = self._load_prompt_template()
        
        # Insert user description into the prompt
        # Add a clear section for the user description
        user_section = f"\n## USER REQUEST\n\nGenerate a flashcard deck based on this description: {description}\n\n"
        
        # Insert before the EXAMPLE OUTPUT section if it exists, otherwise append
        if "EXAMPLE OUTPUT" in template:
            prompt = template.replace("EXAMPLE OUTPUT", user_section + "EXAMPLE OUTPUT")
        else:
            prompt = template + user_section
        
        return prompt
    
    def generate(self, description: str) -> dict:
        """
        Generate a deck from a description.
        
        Args:
            description: User description of the desired deck
            
        Returns:
            Dictionary containing the normalized and validated deck data
            
        Raises:
            ValueError: If API key is missing
            RuntimeError: If OpenAI API call fails
            json.JSONDecodeError: If response is not valid JSON
            ValueError: If validation fails after repair
        """
        # Build prompt
        prompt = self._build_prompt(description)
        
        # Call OpenAI API
        try:
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates flashcard deck JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
        except Exception as e:
            raise RuntimeError(f"OpenAI API error: {str(e)}")
        
        # Extract response text
        if not response.choices or not response.choices[0].message.content:
            raise RuntimeError("OpenAI API returned empty response")
        
        raw_response = response.choices[0].message.content.strip()
        
        # Remove markdown code fences if present
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]  # Remove ```json
        elif raw_response.startswith("```"):
            raw_response = raw_response[3:]  # Remove ```
        
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]  # Remove trailing ```
        
        raw_response = raw_response.strip()
        
        # Parse JSON
        try:
            deck_data = json.loads(raw_response)
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(
                f"Failed to parse JSON from OpenAI response: {str(e)}. "
                f"Raw response preview: {raw_response[:200]}",
                e.doc,
                e.pos
            )
        
        # Inject metadata (override any values from LLM)
        deck_data['source'] = f"openai:{self.MODEL_NAME}"
        deck_data['generated_at'] = date.today().isoformat()
        deck_data['prompt'] = description
        
        # Validate and repair
        normalized, warnings, errors = self.validator.validate_and_repair(deck_data)
        
        # If validation errors remain, fail
        if errors:
            error_msg = "Validation failed after generation:\n"
            error_msg += "\n".join(f"  - {error}" for error in errors)
            raise ValueError(error_msg)
        
        # Store warnings in the normalized deck for reference (optional, but useful)
        # For now, we'll just return the normalized deck
        
        return normalized
