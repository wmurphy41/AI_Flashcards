import { useState, useEffect } from 'react'
import { getDecks, getDeck, type DeckSummary, type Deck } from './api'
import { CardView } from './components/CardView'
import {
  initSession,
  applyAnswer,
  shouldAdvanceCycle,
  startNextCycle,
  calculateCycle1Score,
  type SessionState,
} from './session'
import './App.css'

type View = 'list' | 'detail' | 'study' | 'results'

function App() {
  const [view, setView] = useState<View>('list')
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
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
    if (view === 'detail') {
      setView('list')
      setSelectedDeckId(null)
      setSelectedDeck(null)
    } else if (view === 'study' || view === 'results') {
      setView('detail')
      setSessionState(null)
    }
  }

  const handleStartStudy = () => {
    if (selectedDeck) {
      const session = initSession(selectedDeck.cards)
      setSessionState(session)
      setView('study')
    }
  }

  const handleCardAnswer = (wasCorrect: boolean) => {
    if (!sessionState || !selectedDeck) return

    const currentCard = sessionState.cycleQueue[sessionState.currentCardIndex]
    if (!currentCard) return

    const newState = applyAnswer(sessionState, currentCard.id, wasCorrect)
    const { shouldAdvance, shouldEnd } = shouldAdvanceCycle(newState, selectedDeck.cards)

    if (shouldEnd) {
      setSessionState(newState)
      setView('results')
    } else if (shouldAdvance) {
      const nextCycleState = startNextCycle(newState, selectedDeck.cards)
      setSessionState(nextCycleState)
    } else {
      setSessionState(newState)
    }
  }

  const handleCardTap = () => {
    // Card flip is handled by CardView component
  }

  if (view === 'study' && sessionState && selectedDeck) {
    const currentCard = sessionState.cycleQueue[sessionState.currentCardIndex]
    const progress = sessionState.currentCardIndex + 1
    const total = sessionState.cycleQueue.length

    return (
      <div className="app-container study-container">
        <div className="study-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <div className="study-title">
            <h2>{selectedDeck.title}</h2>
            <p className="cycle-indicator">Cycle {sessionState.cycle} of 4</p>
          </div>
          <div className="progress-indicator">
            {progress} / {total}
          </div>
        </div>
        <div className="study-content">
          {currentCard ? (
            <CardView
              card={currentCard}
              onSwipe={(direction) => handleCardAnswer(direction === 'right')}
              onTap={handleCardTap}
            />
          ) : (
            <p>Loading card...</p>
          )}
        </div>
      </div>
    )
  }

  if (view === 'results' && sessionState) {
    const score = calculateCycle1Score(sessionState)

    return (
      <div className="app-container">
        <div className="header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
          <h1>AI Flashcards</h1>
        </div>
        <div className="content">
          <div className="results-container">
            <h2>Session Complete</h2>
            <div className="score-section">
              <div className="score-main">
                <span className="score-percent">{score.percent}%</span>
                <p className="score-label">Cycle 1 Score</p>
              </div>
              <p className="score-detail">
                {score.correct} / {score.total} correct on Cycle 1
              </p>
            </div>
            {sessionState.cycle > 1 && (
              <p className="cycles-completed">
                Completed {sessionState.cycle} cycle{sessionState.cycle !== 1 ? 's' : ''}
              </p>
            )}
            <button className="study-button" onClick={handleBack}>
              Back to Deck
            </button>
          </div>
        </div>
      </div>
    )
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
              <button className="study-button" onClick={handleStartStudy}>
                Start Study Session
              </button>
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
