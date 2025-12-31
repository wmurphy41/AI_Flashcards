import { DeckSummary, Deck } from './types';

export async function getDecks(): Promise<DeckSummary[]> {
  const response = await fetch('/api/decks');
  if (!response.ok) {
    throw new Error(`Failed to fetch decks: ${response.statusText}`);
  }
  return response.json();
}

export async function getDeck(id: string): Promise<Deck> {
  const response = await fetch(`/api/decks/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Deck not found');
    }
    throw new Error(`Failed to fetch deck: ${response.statusText}`);
  }
  return response.json();
}

