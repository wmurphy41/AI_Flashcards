import { type DeckSummary } from '../api'
import './ManageDecks.css'

interface ManageDecksProps {
  decks: DeckSummary[]
  loading: boolean
  error: string | null
  onBack: () => void
}

// Helper function to check if a deck is a system deck
export function isSystemDeck(deck: DeckSummary & { source?: string }): boolean {
  return deck.source === 'manual'
}

export function ManageDecks({ decks, loading, error, onBack }: ManageDecksProps) {
  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <h1>Manage Decks</h1>
      </div>
      <div className="content">
        {loading && <p className="loading">Loading decks...</p>}
        {error && (
          <div className="error-container">
            <p className="error">Error loading decks</p>
            <p className="error-detail">{error}</p>
            <button className="study-button" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && (
          <>
            <p className="manage-decks-helper">Swipe left to delete a deck</p>
            <div className="deck-list">
              {decks.length === 0 ? (
                <p>No decks available</p>
              ) : (
                decks.map((deck) => {
                  const systemDeck = isSystemDeck(deck as DeckSummary & { source?: string })
                  return (
                    <div
                      key={deck.id}
                      className={`deck-item ${systemDeck ? 'deck-item-system' : ''}`}
                    >
                      <h3 className="deck-title">{deck.title}</h3>
                      {deck.description && (
                        <p className="deck-description">{deck.description}</p>
                      )}
                      <p className="deck-count">
                        {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

