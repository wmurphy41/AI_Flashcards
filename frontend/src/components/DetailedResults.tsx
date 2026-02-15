import { useState } from 'react';
import type { Deck } from '../api';
import type { SessionState } from '../session';
import { classifyCardOutcome, type CardOutcome } from '../sessionStats';
import './DetailedResults.css';

type DetailedResultsProps = {
  deck: Deck;
  sessionState: SessionState;
  startSide: 'front' | 'back';
  onBack: () => void;
};

// Map sessionStats outcome to CSS class status
function outcomeToStatus(outcome: CardOutcome): 'correct-1st' | 'correct-retry' | 'missed' | 'unattempted' {
  switch (outcome) {
    case 'correct-first-time':
      return 'correct-1st';
    case 'correct-on-retry':
      return 'correct-retry';
    case 'missed':
      return 'missed';
    case 'unattempted':
      return 'unattempted';
  }
}

export function DetailedResults({
  deck,
  sessionState,
  startSide,
  onBack,
}: DetailedResultsProps) {
  // Track flip state for each card by UID
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleCard = (cardUid: string) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardUid)) {
        next.delete(cardUid);
      } else {
        next.add(cardUid);
      }
      return next;
    });
  };

  const cardStatuses = deck.cards.map((card) => {
    const outcome = classifyCardOutcome(card, sessionState);
    return {
      card,
      outcome,
      status: outcomeToStatus(outcome),
    };
  });

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <h1>Detailed Results</h1>
      </div>
      <div className="content">
        <div className="detailed-results-container">
          <h2>{deck.title}</h2>
          
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color status-correct-1st"></div>
              <span>Correct 1st</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-correct-retry"></div>
              <span>Correct retry</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-missed"></div>
              <span>Missed</span>
            </div>
            <div className="legend-item">
              <div className="legend-color status-unattempted"></div>
              <span>Unattempted</span>
            </div>
          </div>

          <div className="cards-list">
            {cardStatuses.map(({ card, status }) => {
              const isFlipped = flippedCards.has(card.uid);
              // Determine which text to show based on startSide and flip state
              // If startSide is 'front' and not flipped, show front; if flipped, show back
              // If startSide is 'back' and not flipped, show back; if flipped, show front
              const showFront = (startSide === 'front' && !isFlipped) || (startSide === 'back' && isFlipped);
              const promptText = showFront ? card.front : card.back;
              
              const statusLabels: Record<'correct-1st' | 'correct-retry' | 'missed' | 'unattempted', string> = {
                'correct-1st': 'Correct First Time',
                'correct-retry': 'Correct On Retry',
                'missed': 'Missed',
                'unattempted': 'Unattempted',
              };

              return (
                <div
                  key={card.uid}
                  className={`card-result-item status-${status}`}
                  onClick={() => toggleCard(card.uid)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-result-content">
                    <p className="card-result-text">{promptText}</p>
                    <span className="card-result-status">{statusLabels[status]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

