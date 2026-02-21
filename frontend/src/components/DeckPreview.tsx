import type { Deck } from '../api';
import { CardListWithFlip } from './CardListWithFlip';
import './DetailedResults.css';

type DeckPreviewProps = {
  deck: Deck;
  onBack: () => void;
};

export function DeckPreview({ deck, onBack }: DeckPreviewProps) {
  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <h1>Deck Preview</h1>
      </div>
      <div className="content">
        <div className="detailed-results-container">
          <h2>{deck.title}</h2>
          {deck.cards.length === 0 ? (
            <p className="empty-deck-message">No cards in this deck.</p>
          ) : (
            <CardListWithFlip cards={deck.cards} startSide="front" />
          )}
        </div>
      </div>
    </div>
  );
}
