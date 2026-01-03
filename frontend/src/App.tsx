import { useState, useEffect } from 'react'
import { getDecks, getDeck, type DeckSummary, type Deck } from './api'
import { CardView } from './components/CardView'
import { SessionSetup } from './components/SessionSetup'
import { DetailedResults } from './components/DetailedResults'
import { ConfirmDialog } from './components/ConfirmDialog'
import { CreateDeck } from './components/CreateDeck'
import { ManageDecks } from './components/ManageDecks'
import {
  initSession,
  applyAnswer,
  shouldAdvanceCycle,
  startNextCycle,
  type SessionState,
} from './session'
import { computeScores, computeBreakdown } from './sessionStats'
import './App.css'

type View = 'list' | 'detail' | 'setup' | 'study' | 'results' | 'detailed-results' | 'create-deck' | 'manage-decks'

function App() {
  const [view, setView] = useState<View>('list')
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null)
  const [decks, setDecks] = useState<DeckSummary[]>([])
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null)
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [sessionOptions, setSessionOptions] = useState<{ startSide: 'front' | 'back'; maxCycles: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const [toast, setToast] = useState<{ message: string; truncated?: boolean } | null>(null)

  // Load deck list on mount and when returning to list view
  const refreshDeckList = () => {
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

  useEffect(() => {
    if (view === 'list' || view === 'manage-decks') {
      refreshDeckList()
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
    } else if (view === 'detailed-results') {
      setView('results')
    } else if (view === 'study' || view === 'results') {
      setView('detail')
      setSessionState(null)
      setSessionOptions(null)
    } else if (view === 'create-deck' || view === 'manage-decks') {
      setView('list')
    }
  }

  const handleCreateDeck = () => {
    setView('create-deck')
  }

  const handleManageDecks = () => {
    setView('manage-decks')
  }

  const handleCreateDeckSuccess = async (deck: Deck, truncated?: boolean) => {
    // Show toast
    setToast({
      message: `Deck created: ${deck.title || deck.id}`,
      truncated,
    })

    // Refresh deck list
    refreshDeckList()

    // Navigate to the new deck
    setSelectedDeckId(deck.id)
    setSelectedDeck(deck)
    setView('detail')

    // Clear toast after 3 seconds
    setTimeout(() => {
      setToast(null)
    }, 3000)
  }

  const handleCreateDeckCancel = () => {
    setView('list')
  }

  const handleShowDetailedResults = () => {
    setView('detailed-results')
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

  const handleEndSessionClick = () => {
    setShowEndSessionConfirm(true)
  }

  const handleEndSessionConfirm = () => {
    setShowEndSessionConfirm(false)
    if (sessionState) {
      // Navigate to results immediately, preserving all scoring
      setView('results')
    }
  }

  const handleEndSessionCancel = () => {
    setShowEndSessionConfirm(false)
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
        <div className="study-footer">
          <button className="study-button end-session-button" onClick={handleEndSessionClick}>
            End Session
          </button>
        </div>
        {showEndSessionConfirm && (
          <ConfirmDialog
            title="End session?"
            onConfirm={handleEndSessionConfirm}
            onCancel={handleEndSessionCancel}
            confirmLabel="End"
            cancelLabel="Cancel"
          />
        )}
      </div>
    )
  }

  if (view === 'create-deck') {
    return (
      <CreateDeck
        onSuccess={handleCreateDeckSuccess}
        onCancel={handleCreateDeckCancel}
      />
    )
  }

  if (view === 'manage-decks') {
    return (
      <ManageDecks
        decks={decks}
        loading={loading}
        error={error}
        onBack={handleBack}
        onRefresh={refreshDeckList}
      />
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

  if (view === 'detailed-results' && sessionState && selectedDeck && sessionOptions) {
    return (
      <DetailedResults
        deck={selectedDeck}
        sessionState={sessionState}
        startSide={sessionOptions.startSide}
        onBack={handleBack}
      />
    )
  }

  if (view === 'results' && sessionState && selectedDeck) {
    const scores = computeScores(sessionState)
    const breakdown = computeBreakdown(selectedDeck.cards, sessionState)

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
              <div className="score-group">
                <div className="score-main">
                  <span className="score-percent">{scores.rightOnFirstTry.percent}%</span>
                  <p className="score-label">Right on First Try</p>
                </div>
                <p className="score-detail">
                  {scores.rightOnFirstTry.correct} / {scores.rightOnFirstTry.total}
                </p>
              </div>
              
              <div className="score-group">
                <div className="score-main">
                  <span className="score-percent">{scores.overallScore.percent}%</span>
                  <p className="score-label">Overall Score</p>
                </div>
                <p className="score-detail">
                  {scores.overallScore.correct} / {scores.overallScore.total}
                </p>
              </div>
            </div>

            <div className="breakdown-section">
              <h3>Breakdown</h3>
              <div className="breakdown-list">
                <div className="breakdown-item">
                  <span className="breakdown-label">Correct First Time:</span>
                  <span className="breakdown-value">{breakdown.correctFirstTime}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Correct On Retry:</span>
                  <span className="breakdown-value">{breakdown.correctOnRetry}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Missed:</span>
                  <span className="breakdown-value">{breakdown.missed}</span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Unattempted:</span>
                  <span className="breakdown-value">{breakdown.unattempted}</span>
                </div>
              </div>
            </div>

            <div className="results-actions">
              <button className="study-button" onClick={handleShowDetailedResults}>
                Show Detailed Results
              </button>
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
            <>
              <div className="create-deck-button-container">
                <button className="study-button create-deck-primary-button" onClick={handleCreateDeck}>
                  + Create Deck
                </button>
                <button className="study-button manage-decks-button" onClick={handleManageDecks}>
                  Manage Decks
                </button>
              </div>
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
            </>
          )}
      </div>
      {toast && (
        <div className="toast">
          <div className="toast-content">
            <span className="toast-message">{toast.message}</span>
            {toast.truncated && <span className="toast-note">(input truncated)</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
