import { useState, useRef, useEffect } from 'react'
import { getDeck, updateCard, deleteCard, type Deck, type Card } from '../api'
import { ConfirmDialog } from './ConfirmDialog'
import './EditCards.css'

interface EditCardsProps {
  deckId: string
  onBack: () => void
}

export function EditCards({ deckId, onBack }: EditCardsProps) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')
  const [deleteConfirmCardId, setDeleteConfirmCardId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const touchStartX = useRef<number | null>(null)
  const currentSwipingIndex = useRef<number | null>(null)
  const SWIPE_THRESHOLD = 50

  // Load deck on mount
  useEffect(() => {
    loadDeck()
  }, [deckId])

  // Scroll to top when component mounts or deck loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [deckId])

  // Also scroll to top when deck finishes loading
  useEffect(() => {
    if (deck && !loading) {
      window.scrollTo(0, 0)
    }
  }, [deck, loading])

  const loadDeck = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getDeck(deckId)
      setDeck(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load deck')
    } finally {
      setLoading(false)
    }
  }

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

  const handleCardClick = (card: Card) => {
    // Don't allow edit if swiped
    if (swipedIndex !== null) {
      return
    }
    setEditingCardId(card.id)
    setEditFront(card.front)
    setEditBack(card.back)
    setSwipedIndex(null) // Close any swiped cards
  }

  const handleSaveEdit = async () => {
    if (!editingCardId || !deck) return

    // Validate
    if (!editFront.trim() || !editBack.trim()) {
      setSaveError('Front and back text cannot be empty')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const updatedDeck = await updateCard(deckId, editingCardId, {
        front: editFront.trim(),
        back: editBack.trim(),
      })
      setDeck(updatedDeck)
      setEditingCardId(null)
      setEditFront('')
      setEditBack('')
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update card')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingCardId(null)
    setEditFront('')
    setEditBack('')
    setSaveError(null)
  }

  const handleDeleteClick = (cardId: string) => {
    if (!deck || deck.cards.length <= 1) {
      return // Disabled for last card
    }
    setDeleteConfirmCardId(cardId)
    setSwipedIndex(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmCardId || !deck) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const updatedDeck = await deleteCard(deckId, deleteConfirmCardId)
      setDeck(updatedDeck)
      setDeleteConfirmCardId(null)
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete card')
      setDeleteConfirmCardId(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmCardId(null)
  }

  const handleErrorClose = () => {
    setDeleteError(null)
    setSaveError(null)
  }

  const canDelete = deck && deck.cards.length > 1

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <h1>Edit Cards</h1>
      </div>
      <div className="content">
        {loading && <p className="loading">Loading cards...</p>}
        {error && (
          <div className="error-container">
            <p className="error">Error loading cards</p>
            <p className="error-detail">{error}</p>
            <button className="study-button" onClick={loadDeck}>
              Retry
            </button>
          </div>
        )}
        {deck && !loading && !error && (
          <>
            <div className="edit-cards-header">
              <h2>{deck.title}</h2>
              <p className="card-count">
                {deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}
              </p>
              <p className="edit-cards-helper">Select card to edit<br/>Swipe left to delete.</p>
            </div>
            {deck.cards.length === 0 ? (
              <p>No cards in this deck</p>
            ) : (
              <div className="card-list">
                {deck.cards.map((card, index) => {
                  const isSwiped = swipedIndex === index
                  const isEditing = editingCardId === card.id

                  if (isEditing) {
                    return (
                      <div key={card.uid} className="card-edit-form-container">
                        <div className="card-edit-form">
                          <div className="card-edit-field">
                            <label htmlFor={`edit-front-${card.id}`}>Front</label>
                            <textarea
                              id={`edit-front-${card.id}`}
                              value={editFront}
                              onChange={(e) => setEditFront(e.target.value)}
                              className="card-edit-textarea"
                              rows={3}
                            />
                          </div>
                          <div className="card-edit-field">
                            <label htmlFor={`edit-back-${card.id}`}>Back</label>
                            <textarea
                              id={`edit-back-${card.id}`}
                              value={editBack}
                              onChange={(e) => setEditBack(e.target.value)}
                              className="card-edit-textarea"
                              rows={3}
                            />
                          </div>
                          {saveError && (
                            <p className="error-message">{saveError}</p>
                          )}
                          <div className="card-edit-buttons">
                            <button
                              className="card-edit-save-button"
                              onClick={handleSaveEdit}
                              disabled={isSaving || !editFront.trim() || !editBack.trim()}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              className="card-edit-cancel-button"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={card.uid}
                      className={`card-item-container ${isSwiped ? 'swiped' : ''}`}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div
                        className="card-item"
                        style={{ transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)' }}
                        onClick={() => handleCardClick(card)}
                      >
                        <div className="card-item-front">Front: {card.front}</div>
                        <div className="card-item-back">Back: {card.back}</div>
                      </div>
                      {canDelete && (
                        <div className="card-item-actions">
                          <button
                            className="card-delete-button"
                            onClick={() => handleDeleteClick(card.id)}
                            disabled={isDeleting}
                          >
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {deleteConfirmCardId && (
        <ConfirmDialog
          title="Delete Card?"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmLabel="Delete"
          cancelLabel="Cancel"
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
