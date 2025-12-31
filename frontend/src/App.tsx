import { useState, useEffect } from 'react'
import { getDecks, getDeck } from './api'
import { DeckSummary, Deck } from './types'
import './App.css'

type View = 'list' | 'detail'

function App() {
  const [view, setView] = useState<View>('list')
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load deck list on mount
  useEffect(() => {
    if (view === 'list') {
      setLoading(true)
      setError(null)
      getDecks()
        .then((data) => {
          setDecks(data)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [view])

  // Load deck details when selected
  useEffect(() => {
    if (view === 'detail' && selectedDeckId) {
      setLoading(true)
      setError(null)
      getDeck(selectedDeckId)
        .then((data) => {
          setSelectedDeck(data)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    }
  }, [view, selectedDeckId])

  const handleDeckSelect = (deckId: string) => {
    setSelectedDeckId(deckId)
    setView('detail')
  }

  const handleBack = () => {
    setView('list')
    setSelectedDeckId(null)
    setSelectedDeck(null)
  }

  if (view === 'detail') {
    return (
      <div className="app-container">
        <div className="header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>AI Flashcards</h1>
        </div>
        <div className="content">
          {loading && <p className="loading">Loading deck...</p>}
          {error && <p className="error">Error: {error}</p>}
          {selectedDeck && !loading && (
            <div className="deck-detail">
              <h2>{selectedDeck.title}</h2>
              {selectedDeck.description && (
                <p className="description">{selectedDeck.description}</p>
              )}
              <p className="card-count">
                {selectedDeck.cards.length} card{selectedDeck.cards.length !== 1 ? 's' : ''}
              </p>
              <div className="preview-section">
                <h3>Preview</h3>
                <ul className="card-preview-list">
                  {selectedDeck.cards.slice(0, 5).map((card) => (
                    <li key={card.id} className="card-preview-item">
                      {card.front}
                    </li>
                  ))}
                  {selectedDeck.cards.length > 5 && (
                    <li className="card-preview-item muted">
                      ... and {selectedDeck.cards.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
              <button className="study-button" disabled>
                Start Study Session
              </button>
              <p className="coming-soon">Coming in Phase 4</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>AI Flashcards</h1>
      </div>
      <div className="content">
        {loading && <p className="loading">Loading decks...</p>}
        {error && <p className="error">Error: {error}</p>}
        {!loading && !error && (
          <div className="deck-list">
            {decks.length === 0 ? (
              <p>No decks available</p>
            ) : (
              decks.map((deck) => (
                <div
                  key={deck.id}
                  className="deck-item"
                  onClick={() => handleDeckSelect(deck.id)}
                >
                  <h3 className="deck-title">{deck.title}</h3>
                  {deck.description && (
                    <p className="deck-description">{deck.description}</p>
                  )}
                  <p className="deck-count">
                    {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
