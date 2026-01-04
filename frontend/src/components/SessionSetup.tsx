import { useState } from 'react';
import type { Deck } from '../api';
import './SessionSetup.css';

type SessionSetupProps = {
  deck: Deck;
  onStart: (options: { startSide: 'front' | 'back'; maxCycles: number }) => void;
  onCancel: () => void;
};

export function SessionSetup({ deck, onStart, onCancel }: SessionSetupProps) {
  const [startSide, setStartSide] = useState<'front' | 'back'>('front');
  const [maxCycles, setMaxCycles] = useState<number>(4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStart({ startSide, maxCycles });
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
              <label htmlFor="start-side">Start Side</label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="start-side"
                    value="front"
                    checked={startSide === 'front'}
                    onChange={() => setStartSide('front')}
                  />
                  <span>Front</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="start-side"
                    value="back"
                    checked={startSide === 'back'}
                    onChange={() => setStartSide('back')}
                  />
                  <span>Back</span>
                </label>
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

