import type { Deck } from '../api';
import type { SessionState } from '../session';
import { classifyCardOutcome, type CardOutcome } from '../sessionStats';
import { CardListWithFlip, type CardResultStatus } from './CardListWithFlip';
import './DetailedResults.css';

type DetailedResultsProps = {
  deck: Deck;
  sessionState: SessionState;
  startSide: 'front' | 'back';
  onBack: () => void;
};

// Map sessionStats outcome to CSS class status
function outcomeToStatus(outcome: CardOutcome): CardResultStatus {
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
  const cardStatuses = deck.cards.map((card) => {
    const outcome = classifyCardOutcome(card, sessionState);
    return {
      card,
      status: outcomeToStatus(outcome),
    };
  });

  const statusByUid: Record<string, CardResultStatus> = Object.fromEntries(
    cardStatuses.map(({ card, status }) => [card.uid, status])
  );

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

          <CardListWithFlip
            cards={deck.cards}
            startSide={startSide}
            statusByUid={statusByUid}
          />
        </div>
      </div>
    </div>
  );
}

