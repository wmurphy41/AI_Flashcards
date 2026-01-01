import { useState, useEffect } from 'react'
import { getDecks, getDeck, type DeckSummary, type Deck } from './api'
import { CardView } from './components/CardView'
import { SessionSetup } from './components/SessionSetup'
import {
  initSession,
  applyAnswer,
  shouldAdvanceCycle,
  startNextCycle,
  calculateCycle1Score,
  type SessionState,
} from './session'
import './App.css'

type View = 'list' | 'detail' | 'setup' | 'study' | 'results'

function App() {
  const [view, setView] = useState<View>('list')
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [sessionOptions, setSessionOptions] = useState<{ startSide: 'front' | 'back'; maxCycles: number } | null>(null)
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
    } else if (view === 'setup') {
      setView('detail')
      setSessionOptions(null)
    } else if (view === 'study' || view === 'results') {
      setView('detail')
      setSessionState(null)
      setSessionOptions(null)
    }
  }

  const handleFinish = () => {
    setView('list')
    setSessionState(null)
    setSelectedDeckId(null)
    setSelectedDeck(null)
  }

  const handleStartStudy = () => {
    if (selectedDeck) {
      // Handle edge case: deck with no cards
      if (selectedDeck.cards.length === 0) {
        setError('This deck has no cards to study.')
        return
      }
      setView('setup')
    }
  }

  const handleSetupStart = (options: { startSide: 'front' | 'back'; maxCycles: number }) => {
    if (selectedDeck) {
      setSessionOptions(options)
      const session = initSession(selectedDeck.cards, options.maxCycles)
      setSessionState(session)
      setView('study')
    }
  }

  const handleSetupCancel = () => {
    setView('detail')
    setSessionOptions(null)
  }

  const handleCardAnswer = (wasCorrect: boolean) => {
    if (!sessionState || !selectedDeck) return

    const currentCard = sessionState.cycleQueue[sessionState.currentCardIndex]
    if (!currentCard) return

    const newState = applyAnswer(sessionState, currentCard.uid, wasCorrect)
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
    // Handle edge case: no cards in current cycle queue
    if (sessionState.cycleQueue.length === 0) {
      return (
        <div className="app-container study-container">
          <div className="study-header">
            <button className="back-button" onClick={handleBack}>
              ← Back
            </button>
            <div className="study-title">
              <h2>{selectedDeck.title}</h2>
            </div>
          </div>
          <div className="study-content">
            <div className="empty-state">
              <p>No cards available in this cycle.</p>
              <button className="study-button" onClick={handleBack}>
                Back to Deck
              </button>
            </div>
          </div>
        </div>
      )
    }

    const currentCard = sessionState.cycleQueue[sessionState.currentCardIndex]
    const progress = sessionState.currentCardIndex + 1
    const total = sessionState.cycleQueue.length

    // Safety check: ensure currentCard exists
    if (!currentCard) {
      return (
        <div className="app-container study-container">
          <div className="study-header">
            <button className="back-button" onClick={handleBack}>
              ← Back
            </button>
            <div className="study-title">
              <h2>{selectedDeck.title}</h2>
            </div>
          </div>
          <div className="study-content">
            <div className="empty-state">
              <p>Session completed.</p>
              <button className="study-button" onClick={handleBack}>
                Back to Deck
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="app-container study-container">
        <div className="study-header">
          <button className="back-button" onClick={handleBack}>
            ← Back
          </button>
            <div className="study-title">
              <h2>{selectedDeck.title || 'Study Session'}</h2>
              <p className="cycle-indicator">Cycle {sessionState.cycle} of {sessionState.maxCycles}</p>
            </div>
          <div className="progress-indicator">
            {progress} / {total}
          </div>
        </div>
        <div className="study-content">
          <CardView
            card={currentCard}
            onSwipe={(direction) => handleCardAnswer(direction === 'right')}
            onTap={handleCardTap}
            startSide={sessionOptions?.startSide || 'front'}
          />
        </div>
      </div>
    )
  }

  if (view === 'setup' && selectedDeck) {
    return (
      <SessionSetup
        deck={selectedDeck}
        onStart={handleSetupStart}
        onCancel={handleSetupCancel}
      />
    )
  }

  if (view === 'results' && sessionState) {
    const score = calculateCycle1Score(sessionState)
    const remainingIncorrect = sessionState.incorrectCardIds.size

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
            {remainingIncorrect > 0 && (
              <p className="remaining-incorrect">
                {remainingIncorrect} card{remainingIncorrect !== 1 ? 's' : ''} still need practice
              </p>
            )}
            <div className="results-actions">
              <button className="study-button" onClick={handleBack}>
                Replay Session
              </button>
              <button className="study-button" onClick={handleFinish}>
                Finished
              </button>
            </div>
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
          {error && (
            <div className="error-container">
              <p className="error">Error loading deck</p>
              <p className="error-detail">{error}</p>
              <button className="study-button" onClick={handleBack}>
                Back to List
              </button>
            </div>
          )}
          {selectedDeck && !loading && !error && (
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
                    <li key={card.uid} className="card-preview-item">
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
              {selectedDeck.cards.length === 0 ? (
                <div className="empty-deck-message">
                  <p>This deck has no cards to study.</p>
                </div>
              ) : (
                <button className="study-button" onClick={handleStartStudy}>
                  Start Study Session
                </button>
              )}
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
