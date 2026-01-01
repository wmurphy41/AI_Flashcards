import type { Card, Deck } from '../api';
import type { SessionState } from '../session';
import './DetailedResults.css';

type DetailedResultsProps = {
  deck: Deck;
  sessionState: SessionState;
  startSide: 'front' | 'back';
  onBack: () => void;
};

type CardStatus = 'correct-1st' | 'correct-retry' | 'missed' | 'unattempted';

function classifyCardStatus(
  card: Card,
  sessionState: SessionState
): CardStatus {
  const cycle1Result = sessionState.cycle1Answers.get(card.uid);
  
  if (cycle1Result === undefined) {
    // Not in cycle1Answers means never attempted
    return 'unattempted';
  }
  
  if (cycle1Result === true) {
    // Correct on cycle 1 - Green (even if later incorrect)
    return 'correct-1st';
  }
  
  // Was incorrect on cycle 1 - check if eventually got correct
  if (sessionState.incorrectCardIds.has(card.uid)) {
    // Still in incorrect set - never got correct
    return 'missed';
  } else {
    // Not in incorrect set but was wrong on cycle 1 - got correct later
    return 'correct-retry';
  }
}

export function DetailedResults({
  deck,
  sessionState,
  startSide,
  onBack,
}: DetailedResultsProps) {
  const cardStatuses = deck.cards.map((card) => ({
    card,
    status: classifyCardStatus(card, sessionState),
  }));

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          ← Back
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
              const promptText = startSide === 'front' ? card.front : card.back;
              const statusLabels: Record<CardStatus, string> = {
                'correct-1st': 'Correct 1st',
                'correct-retry': 'Correct retry',
                'missed': 'Missed',
                'unattempted': 'Unattempted',
              };

              return (
                <div
                  key={card.uid}
                  className={`card-result-item status-${status}`}
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

