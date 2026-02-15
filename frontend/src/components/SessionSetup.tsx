import { useState } from 'react';
import type { Deck } from '../api';
import './SessionSetup.css';

type SessionSetupProps = {
  deck: Deck;
  onStart: (options: { startSide: 'front' | 'back'; maxCycles: number; cardOrder: 'original' | 'random' }) => void;
  onCancel: () => void;
};

export function SessionSetup({ deck, onStart, onCancel }: SessionSetupProps) {
  const [startSide, setStartSide] = useState<'front' | 'back'>('front');
  const [maxCycles, setMaxCycles] = useState<number>(4);
  const [cardOrder, setCardOrder] = useState<'original' | 'random'>('original');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ startSide, maxCycles, cardOrder });
  };

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onCancel}>
          Back
        </button>
        <h1>Session Setup</h1>
      </div>
      <div className="content">
        <div className="session-setup-container">
          <h2>{deck.title}</h2>
          
          <form onSubmit={handleSubmit} className="setup-form">
            <div className="setup-control">
              <div className="toggle-row">
                <label htmlFor="start-side">Start Side:</label>
                <div className="toggle-container">
                  <span className={`toggle-label ${startSide === 'front' ? 'active' : ''}`}>Front</span>
                  <button
                    type="button"
                    className={`toggle-switch ${startSide === 'back' ? 'active' : ''}`}
                    onClick={() => setStartSide(startSide === 'front' ? 'back' : 'front')}
                    aria-label={`Start side: ${startSide}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                  <span className={`toggle-label ${startSide === 'back' ? 'active' : ''}`}>Back</span>
                </div>
              </div>
            </div>

            <div className="setup-control">
              <div className="toggle-row">
                <label htmlFor="card-order">Card Order:</label>
                <div className="toggle-container">
                  <span className={`toggle-label ${cardOrder === 'original' ? 'active' : ''}`}>Original</span>
                  <button
                    type="button"
                    className={`toggle-switch ${cardOrder === 'random' ? 'active' : ''}`}
                    onClick={() => setCardOrder(cardOrder === 'original' ? 'random' : 'original')}
                    aria-label={`Card order: ${cardOrder}`}
                  >
                    <span className="toggle-slider"></span>
                  </button>
                  <span className={`toggle-label ${cardOrder === 'random' ? 'active' : ''}`}>Random</span>
                </div>
              </div>
            </div>

            <div className="setup-control">
              <label htmlFor="max-cycles">Max Cycles</label>
              <div className="cycle-selector">
                <button
                  type="button"
                  className="cycle-button cycle-decrement"
                  onClick={() => setMaxCycles(Math.max(1, maxCycles - 1))}
                  disabled={maxCycles <= 1}
                  aria-label="Decrease cycles"
                >
                  −
                </button>
                <span className="cycle-value">{maxCycles}</span>
                <button
                  type="button"
                  className="cycle-button cycle-increment"
                  onClick={() => setMaxCycles(Math.min(6, maxCycles + 1))}
                  disabled={maxCycles >= 6}
                  aria-label="Increase cycles"
                >
                  +
                </button>
              </div>
              <p className="control-hint">Number of study cycles (1-6)</p>
            </div>

            <div className="setup-actions">
              <button type="submit" className="study-button primary">
                Start Session
              </button>
              <button type="button" className="study-button secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

