import { useState, useEffect } from 'react'
import { getDeck, updateDeck, type Deck } from '../api'
import './EditDeck.css'

interface EditDeckProps {
  deckId: string
  onSave: () => void
  onCancel: () => void
}

export function EditDeck({ deckId, onSave, onCancel }: EditDeckProps) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Editable values
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  
  // Original values for comparison
  const [originalTitle, setOriginalTitle] = useState('')
  const [originalDescription, setOriginalDescription] = useState('')
  const [originalPrompt, setOriginalPrompt] = useState<string | undefined>(undefined)
  const [hasPromptField, setHasPromptField] = useState(false)

  // Load deck on mount
  useEffect(() => {
    setLoading(true)
    setError(null)
    getDeck(deckId)
      .then((data) => {
        // Check if prompt field exists and has a value (not null or undefined)
        // Pydantic may include prompt: null even if it wasn't in the original JSON
        // Use != to catch both null and undefined in one check
        const promptExists = data.prompt != null
        setDeck(data)
        setTitle(data.title)
        setDescription(data.description || '')
        setPrompt(data.prompt || '')
        setOriginalTitle(data.title)
        setOriginalDescription(data.description || '')
        setOriginalPrompt(data.prompt)
        setHasPromptField(promptExists)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [deckId])

  // Check if any fields have been edited
  const hasChanges = 
    title !== originalTitle ||
    description !== originalDescription ||
    (hasPromptField && prompt !== (originalPrompt || ''))

  // Check if prompt was edited
  const promptEdited = hasPromptField && prompt !== (originalPrompt || '')

  const handleSave = async () => {
    if (!hasChanges || !deck) return

    setSaving(true)
    setError(null)

    try {
      await updateDeck(deckId, {
        title: title.trim(),
        description: description.trim() || undefined,
        prompt: hasPromptField ? (prompt.trim() || undefined) : undefined,
      })
      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to update deck')
      setSaving(false)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  if (loading) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>Edit Deck</h1>
        </div>
        <div className="content">
          <p className="loading">Loading deck...</p>
        </div>
      </div>
    )
  }

  if (error && !deck) {
    return (
      <div className="app-container">
        <div className="header">
          <h1>Edit Deck</h1>
        </div>
        <div className="content">
          <div className="error-container">
            <p className="error">Error loading deck</p>
            <p className="error-detail">{error}</p>
            <button className="study-button" onClick={handleCancel}>
              Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!deck) {
    return null
  }

  return (
    <div className="app-container">
      <div className="header">
        <h1>Edit Deck</h1>
      </div>
      <div className="content">
        <div className="edit-deck-container">
          <div className="edit-field">
            <label htmlFor="edit-title">Title</label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="edit-input"
            />
          </div>

          <div className="edit-field">
            <label htmlFor="edit-description">Description</label>
            <textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="edit-textarea"
              rows={3}
            />
          </div>

          {hasPromptField && (
            <div className="edit-field">
              <label htmlFor="edit-prompt">Prompt</label>
              <textarea
                id="edit-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="edit-textarea"
                rows={4}
              />
            </div>
          )}

          <div className="edit-buttons">
            <button
              className="edit-save-button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              {promptEdited ? 'Save and Regenerate' : 'Save'}
            </button>
            <button
              className="edit-cancel-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <p className="card-count">
            {deck.cards.length} card{deck.cards.length !== 1 ? 's' : ''}
          </p>

          <div className="preview-section">
            <h3>Preview</h3>
            <ul className="card-preview-list">
              {deck.cards.slice(0, 3).map((card) => (
                <li key={card.uid} className="card-preview-item">
                  {card.front}
                </li>
              ))}
              {deck.cards.length > 3 && (
                <li className="card-preview-item muted">
                  ... and {deck.cards.length - 3} more
                </li>
              )}
            </ul>
          </div>

          {error && (
            <div className="error-container">
              <p className="error">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
