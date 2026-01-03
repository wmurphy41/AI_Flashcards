import { useState } from 'react';
import { generateDeck, type Deck } from '../api';
import './CreateDeck.css';

type CreateDeckProps = {
  onSuccess: (deck: Deck, truncated?: boolean) => void;
  onCancel: () => void;
};

export function CreateDeck({ onSuccess, onCancel }: CreateDeckProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);

  const maxLength = 2000;
  const charCount = description.length;
  const isEmpty = description.trim().length === 0;
  const isDisabled = loading || isEmpty;

  const handleSubmit = async () => {
    if (isDisabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await generateDeck({ description });
      onSuccess(response.deck, response.truncated);
    } catch (err: any) {
      setError({
        message: err.message || 'Failed to generate deck',
        details: err.details || [],
      });
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setDescription(value);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onCancel}>
          ← Back
        </button>
        <h1>Create Deck</h1>
      </div>
      <div className="content">
        <div className="create-deck-container">
          <div className="create-deck-form">
            <label htmlFor="description" className="create-deck-label">
              Describe the deck you want to create
            </label>
            <textarea
              id="description"
              className="create-deck-textarea"
              value={description}
              onChange={handleChange}
              placeholder="e.g., Create a deck for current starting NFL quarterbacks. Put the NFL team name on the front and the quarterback's name on the back."
              maxLength={maxLength}
              rows={8}
              disabled={loading}
            />
            <div className="create-deck-counter">
              {charCount} / {maxLength}
            </div>

            {error && (
              <div className="create-deck-error">
                <p className="error-message">{error.message}</p>
                {error.details && error.details.length > 0 && (
                  <ul className="error-details">
                    {error.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="create-deck-actions">
              <button
                className="study-button create-deck-button"
                onClick={handleSubmit}
                disabled={isDisabled}
              >
                {loading ? 'Generating...' : 'Generate Deck'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

