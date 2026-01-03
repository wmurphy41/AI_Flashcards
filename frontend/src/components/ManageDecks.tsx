import { useState, useRef } from 'react'
import { deleteDeck, type DeckSummary } from '../api'
import { ConfirmDialog } from './ConfirmDialog'
import './ManageDecks.css'

interface ManageDecksProps {
  decks: DeckSummary[]
  loading: boolean
  error: string | null
  onBack: () => void
  onRefresh: () => void
}

// Helper function to check if a deck is a system deck
export function isSystemDeck(deck: DeckSummary & { source?: string }): boolean {
  return deck.source === 'manual'
}

export function ManageDecks({ decks, loading, error, onBack, onRefresh }: ManageDecksProps) {
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null)
  const [deleteConfirmDeck, setDeleteConfirmDeck] = useState<DeckSummary | null>(null)
  const [systemDeckWarning, setSystemDeckWarning] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const currentSwipingIndex = useRef<number | null>(null)

  const SWIPE_THRESHOLD = 50

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchStartX.current = e.touches[0].clientX
    currentSwipingIndex.current = index
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || currentSwipingIndex.current === null) return

    const deltaX = e.touches[0].clientX - touchStartX.current

    // Allow vertical scrolling
    if (Math.abs(deltaX) < 10) return

    // Prevent default to avoid scrolling while swiping horizontally
    if (Math.abs(deltaX) > Math.abs(e.touches[0].clientY - (e.touches[0].clientY - deltaX * 0.1))) {
      e.preventDefault()
    }

    // Only handle horizontal swipes
    if (Math.abs(deltaX) > 20) {
      if (deltaX < -SWIPE_THRESHOLD) {
        // Swipe left - reveal delete
        if (swipedIndex !== currentSwipingIndex.current) {
          setSwipedIndex(currentSwipingIndex.current)
        }
      } else if (deltaX > SWIPE_THRESHOLD) {
        // Swipe right - close
        if (swipedIndex === currentSwipingIndex.current) {
          setSwipedIndex(null)
        }
      }
    }
  }

  const handleTouchEnd = () => {
    touchStartX.current = null
    currentSwipingIndex.current = null
  }

  const handleDeleteClick = (deck: DeckSummary) => {
    if (isSystemDeck(deck as DeckSummary & { source?: string })) {
      setSystemDeckWarning(true)
      setSwipedIndex(null)
    } else {
      setDeleteConfirmDeck(deck)
      setSwipedIndex(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDeck) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteDeck(deleteConfirmDeck.id)
      setDeleteConfirmDeck(null)
      onRefresh()
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete deck')
      setDeleteConfirmDeck(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmDeck(null)
  }

  const handleSystemWarningClose = () => {
    setSystemDeckWarning(false)
  }

  const handleErrorClose = () => {
    setDeleteError(null)
  }

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
                decks.map((deck, index) => {
                  const systemDeck = isSystemDeck(deck as DeckSummary & { source?: string })
                  const isSwiped = swipedIndex === index
                  return (
                    <div
                      key={deck.id}
                      className={`deck-item-container ${isSwiped ? 'swiped' : ''}`}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div
                        className={`deck-item ${systemDeck ? 'deck-item-system' : ''}`}
                        style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)' }}
                      >
                        <h3 className="deck-title">{deck.title}</h3>
                        {deck.description && (
                          <p className="deck-description">{deck.description}</p>
                        )}
                        <p className="deck-count">
                          {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {!systemDeck && (
                        <div className="deck-item-actions">
                          <button
                            className="deck-delete-button"
                            onClick={() => handleDeleteClick(deck)}
                            disabled={isDeleting}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>

      {deleteConfirmDeck && (
        <ConfirmDialog
          title="Delete Deck?"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
      )}

      {systemDeckWarning && (
        <ConfirmDialog
          title="Cannot delete system decks"
          onConfirm={handleSystemWarningClose}
          onCancel={handleSystemWarningClose}
          confirmLabel="OK"
          cancelLabel={undefined}
        />
      )}

      {deleteError && (
        <ConfirmDialog
          title="Delete failed"
          message={deleteError}
          onConfirm={handleErrorClose}
          onCancel={handleErrorClose}
          confirmLabel="OK"
          cancelLabel={undefined}
        />
      )}
    </div>
  )
}
