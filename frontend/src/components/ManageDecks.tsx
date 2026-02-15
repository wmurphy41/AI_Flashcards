import { useState, useRef, useEffect } from 'react'
import { deleteDeck, updateDeckOrder, type DeckSummary } from '../api'
import { ConfirmDialog } from './ConfirmDialog'
import './ManageDecks.css'

interface ManageDecksProps {
  decks: DeckSummary[]
  loading: boolean
  error: string | null
  onBack: () => void
  onRefresh: () => void
  onEdit: (deckId: string) => void
}

// Helper function to check if a deck is a system deck
export function isSystemDeck(deck: DeckSummary & { source?: string }): boolean {
  return deck.source === 'system'
}

export function ManageDecks({ decks, loading, error, onBack, onRefresh, onEdit }: ManageDecksProps) {
  const [swipedIndex, setSwipedIndex] = useState<number | null>(null)
  const [deleteConfirmDeck, setDeleteConfirmDeck] = useState<DeckSummary | null>(null)
  const [systemDeckWarning, setSystemDeckWarning] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [reorderMode, setReorderMode] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [draggedDeckId, setDraggedDeckId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<number>(0)
  const [reorderError, setReorderError] = useState<string | null>(null)
  const [displayDecks, setDisplayDecks] = useState<DeckSummary[]>(decks)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const currentSwipingIndex = useRef<number | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLongPressing = useRef<boolean>(false)
  const isDragging = useRef<boolean>(false)
  const dragStartY = useRef<number | null>(null)
  const dragStartIndex = useRef<number | null>(null)
  const longPressStartY = useRef<number | null>(null)

  const SWIPE_THRESHOLD = 50
  const LONG_PRESS_DURATION = 500

  // Update displayDecks when decks prop changes
  useEffect(() => {
    setDisplayDecks(decks)
  }, [decks])

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    // If in reorder mode, handle drag start
    if (reorderMode) {
      isDragging.current = true
      dragStartY.current = e.touches[0].clientY
      dragStartIndex.current = index
      setDraggedDeckId(displayDecks[index].id)
      setDraggedIndex(index)
      setDragOffset(0)
      e.preventDefault()
      return
    }

    // Normal swipe handling
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    longPressStartY.current = e.touches[0].clientY
    currentSwipingIndex.current = index
    isLongPressing.current = false

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true
      isDragging.current = true
      setReorderMode(true)
      setDraggedDeckId(decks[index].id)
      setDraggedIndex(index)
      dragStartIndex.current = index
      setDragOffset(0)
      // dragStartY will be set in handleTouchMove when drag actually starts
    }, LONG_PRESS_DURATION)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // If in reorder mode and dragging
    if (reorderMode && isDragging.current && draggedDeckId !== null && dragStartIndex.current !== null) {
      // Initialize dragStartY if not set (can happen if timer just fired)
      if (dragStartY.current === null) {
        dragStartY.current = e.touches[0].clientY
      }
      
      const currentY = e.touches[0].clientY
      const deltaY = currentY - dragStartY.current
      setDragOffset(deltaY)
      
      // Find current position of dragged item in displayDecks
      const currentIndex = displayDecks.findIndex(d => d.id === draggedDeckId)
      if (currentIndex === -1) return
      
      // Calculate which index we're hovering over based on current position
      const itemHeight = 120 // Approximate height of deck item
      const targetIndex = Math.round(deltaY / itemHeight) + dragStartIndex.current
      const clampedIndex = Math.max(0, Math.min(targetIndex, displayDecks.length - 1))
      
      // Update order if we've moved to a different position
      if (clampedIndex !== currentIndex && clampedIndex >= 0 && clampedIndex < displayDecks.length) {
        const newDecks = [...displayDecks]
        const [removed] = newDecks.splice(currentIndex, 1)
        newDecks.splice(clampedIndex, 0, removed)
        setDisplayDecks(newDecks)
        setDraggedIndex(clampedIndex)
      }
      
      e.preventDefault()
      return
    }

    // Cancel long press if user moves too much
    if (touchStartX.current !== null && touchStartY.current !== null && !reorderMode) {
      const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current)
      const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current)
      
      if (deltaX > 10 || deltaY > 10) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      }
    }

    // Normal swipe handling (only if not in reorder mode)
    if (reorderMode || touchStartX.current === null || currentSwipingIndex.current === null) return

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

  const handleTouchEnd = async () => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // If in reorder mode and dragging
    if (reorderMode && isDragging.current && draggedDeckId !== null && dragStartIndex.current !== null) {
      // Check if order actually changed
      const originalIndex = dragStartIndex.current
      const finalIndex = displayDecks.findIndex(d => d.id === draggedDeckId)

      // Update backend if position changed
      if (finalIndex !== originalIndex && finalIndex >= 0) {
        try {
          const deckIds = displayDecks.map(d => d.id)
          await updateDeckOrder(deckIds)
          setReorderError(null)
          onRefresh() // Refresh to get updated order from backend
        } catch (err: any) {
          // Extract error message properly
          let errorMessage = 'Failed to update deck order'
          
          // Try to extract message from various error formats
          if (err instanceof Error) {
            // Check if message is actually useful (not [object Object])
            const msg = err.message || String(err)
            if (msg && msg !== '[object Object]' && !msg.startsWith('[object')) {
              errorMessage = msg
            } else {
              // Message is not useful, try to extract from error object itself
              const errAny = err as any
              if (errAny.detail && typeof errAny.detail === 'string') {
                errorMessage = errAny.detail
              } else if (errAny.error && typeof errAny.error === 'string') {
                errorMessage = errAny.error
              } else if (errAny.details && Array.isArray(errAny.details) && errAny.details.length > 0) {
                errorMessage = errAny.details[0]
              }
            }
          } else if (typeof err === 'string') {
            errorMessage = err
          } else if (err && typeof err === 'object') {
            // Check various properties that might contain the error message
            if (typeof err.message === 'string' && err.message && err.message !== '[object Object]') {
              errorMessage = err.message
            } else if (typeof err.detail === 'string' && err.detail) {
              errorMessage = err.detail
            } else if (typeof err.error === 'string' && err.error) {
              errorMessage = err.error
            } else if (err.details && Array.isArray(err.details) && err.details.length > 0) {
              errorMessage = err.details[0]
            } else {
              // Last resort: try to stringify safely
              try {
                const stringified = JSON.stringify(err)
                if (stringified && stringified !== '{}' && stringified !== '[object Object]') {
                  errorMessage = stringified
                }
              } catch {
                // If stringification fails, use default
              }
            }
          }
          
          setReorderError(errorMessage)
          // Restore original order on error
          setDisplayDecks(decks)
        }
      }

      // Reset drag state
      isDragging.current = false
      setDraggedIndex(null)
      setDraggedDeckId(null)
      setDragOffset(0)
      dragStartY.current = null
      dragStartIndex.current = null
      
      // Exit reorder mode
      setReorderMode(false)
      return
    }

    // If long press was detected but no drag occurred, exit reorder mode
    if (reorderMode && !isDragging.current) {
      setReorderMode(false)
      setDraggedIndex(null)
      setDraggedDeckId(null)
      setDragOffset(0)
      setDisplayDecks(decks) // Restore original order
    }

    // Reset normal swipe state
    touchStartX.current = null
    touchStartY.current = null
    currentSwipingIndex.current = null
    isLongPressing.current = false
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

  const handleReorderErrorClose = () => {
    setReorderError(null)
  }

  // Exit reorder mode when clicking outside
  useEffect(() => {
    if (!reorderMode) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.deck-list')) {
        setReorderMode(false)
        setDraggedIndex(null)
        setDraggedDeckId(null)
        setDragOffset(0)
        setDisplayDecks(decks) // Restore original order
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [reorderMode, decks])

  return (
    <div className="app-container">
      <div className="header">
        <button className="back-button" onClick={onBack}>
          Back
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
            <p className="manage-decks-helper">
              {reorderMode ? (
                <>Long press and drag to reorder<br />Tap outside to exit</>
              ) : (
                <>Swipe left to delete a deck<br />Click on deck to edit<br />Long press to reorder</>
              )}
            </p>
            <div className={`deck-list ${reorderMode ? 'reorder-mode' : ''}`}>
              {displayDecks.length === 0 ? (
                <p>No decks available</p>
              ) : (
                displayDecks.map((deck, index) => {
                  const systemDeck = isSystemDeck(deck as DeckSummary & { source?: string })
                  const isSwiped = swipedIndex === index && !reorderMode
                  const isDragged = draggedIndex === index
                  const dragStyle = isDragged && dragOffset !== 0
                    ? { transform: `translateY(${dragOffset}px)`, zIndex: 1000, opacity: 0.8 }
                    : {}
                  
                  return (
                    <div
                      key={deck.id}
                      className={`deck-item-container ${isSwiped ? 'swiped' : ''} ${isDragged ? 'dragging' : ''} ${reorderMode ? 'reorder-mode-item' : ''}`}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div
                        className={`deck-item ${systemDeck ? 'deck-item-system' : ''} ${isDragged ? 'deck-item-dragging' : ''}`}
                        style={{
                          transform: isSwiped ? 'translateX(-80px)' : 'translateX(0)',
                          ...dragStyle
                        }}
                        onClick={(e) => {
                          // Disable click in reorder mode
                          if (reorderMode) {
                            e.stopPropagation()
                            return
                          }
                          // Only allow click when not swiped
                          if (!isSwiped) {
                            e.stopPropagation()
                            onEdit(deck.id)
                          }
                        }}
                      >
                        <h3 className="deck-title">{deck.title}</h3>
                        {deck.description && (
                          <p className="deck-description">{deck.description}</p>
                        )}
                        <p className="deck-count">
                          {deck.card_count} card{deck.card_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {!systemDeck && !reorderMode && (
                        <div className="deck-item-actions">
                          <button
                            className="deck-delete-button"
                            onClick={() => handleDeleteClick(deck)}
                            disabled={isDeleting}
                          >
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

      {reorderError && (
        <ConfirmDialog
          title="Reorder failed"
          message={reorderError}
          onConfirm={handleReorderErrorClose}
          onCancel={handleReorderErrorClose}
          confirmLabel="OK"
          cancelLabel={undefined}
        />
      )}
    </div>
  )
}
