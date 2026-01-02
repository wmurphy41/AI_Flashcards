// Define types inline to avoid module resolution issues
type Card = {
  id: string;
  uid: string;
  front: string;
  back: string;
};

type DeckSummary = {
  id: string;
  title: string;
  description?: string;
  card_count: number;
};

type Deck = {
  id: string;
  title: string;
  description?: string;
  cards: Card[];
};

type GenerateDeckRequest = {
  description: string;
};

type GenerateDeckResponse = {
  deck: Deck;
  path: string;
  truncated: boolean;
};

type ApiError = {
  error: string;
  details?: string[];
};

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

export async function generateDeck(description: string): Promise<GenerateDeckResponse> {
  const response = await fetch('/api/ai/decks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    const apiError = errorData as ApiError;
    const error = new Error(apiError.error || `Failed to generate deck: ${response.statusText}`);
    (error as any).details = apiError.details || [];
    throw error;
  }

  return response.json();
}

// Export types for use in other files
export type { Card, DeckSummary, Deck, GenerateDeckResponse, ApiError };
