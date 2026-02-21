import { useState } from 'react';
import type { Card } from '../api';
import './DetailedResults.css';

export type CardResultStatus = 'correct-1st' | 'correct-retry' | 'missed' | 'unattempted';

const statusLabels: Record<CardResultStatus, string> = {
  'correct-1st': 'Correct First Time',
  'correct-retry': 'Correct On Retry',
  'missed': 'Missed',
  'unattempted': 'Unattempted',
};

type CardListWithFlipProps = {
  cards: Card[];
  startSide: 'front' | 'back';
  statusByUid?: Record<string, CardResultStatus>;
};

export function CardListWithFlip({
  cards,
  startSide,
  statusByUid,
}: CardListWithFlipProps) {
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

  return (
    <div className="cards-list">
      {cards.map((card) => {
        const isFlipped = flippedCards.has(card.uid);
        const showFront =
          (startSide === 'front' && !isFlipped) || (startSide === 'back' && isFlipped);
        const promptText = showFront ? card.front : card.back;
        const status = statusByUid?.[card.uid];
        const statusClass = status ? `status-${status}` : '';

        return (
          <div
            key={card.uid}
            className={`card-result-item ${statusClass}`.trim()}
            onClick={() => toggleCard(card.uid)}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-result-content">
              <p className="card-result-text">{promptText}</p>
              {status != null && (
                <span className="card-result-status">{statusLabels[status]}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
