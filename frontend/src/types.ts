export interface Card {
  id: string;
  front: string;
  back: string;
}

export interface DeckSummary {
  id: string;
  title: string;
  description?: string;
  card_count: number;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  cards: Card[];
}

