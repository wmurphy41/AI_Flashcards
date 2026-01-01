import { useState, useRef, useEffect } from 'react';
import type { Card } from '../api';
import './CardView.css';

type CardViewProps = {
  card: Card;
  onSwipe: (direction: 'left' | 'right') => void;
  onTap: () => void;
  startSide?: 'front' | 'back';
};

const SWIPE_THRESHOLD = 80;

export function CardView({ card, onSwipe, onTap, startSide = 'front' }: CardViewProps) {
  const [isFlipped, setIsFlipped] = useState(startSide === 'back');
  const [dragOffset, setDragOffset] = useState(0);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);

  // Reset flip state when card changes (use startSide to determine initial state)
  useEffect(() => {
    setIsFlipped(startSide === 'back');
  }, [card.uid, startSide]);

  // Scoring side is the opposite of start side
  // If startSide = 'front', scoringSide = 'back' (isFlipped = true)
  // If startSide = 'back', scoringSide = 'front' (isFlipped = false)
  const isScoringSide = (startSide === 'front' && isFlipped) || (startSide === 'back' && !isFlipped);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // Only left mouse button
    
    startPos.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
    setDragOffset(0);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    
    // Only start dragging if horizontal movement is significant
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      isDragging.current = true;
    }
    
    if (isDragging.current && Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal drag - limit to reasonable range
      const maxOffset = 200;
      const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
      setDragOffset(clampedOffset);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!startPos.current) return;
    
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Check if it's a swipe
    if (absDeltaX > SWIPE_THRESHOLD && absDeltaX > absDeltaY) {
      // Only allow swipe when on the scoring side (opposite of start side)
      if (isScoringSide) {
        if (deltaX > 0) {
          onSwipe('right');
        } else {
          onSwipe('left');
        }
        setDragOffset(0);
      } else {
        // If not on scoring side, ignore swipe and reset drag offset
        setDragOffset(0);
      }
    } else if (!isDragging.current) {
      // It was a tap, not a drag
      setIsFlipped(!isFlipped);
      onTap();
    } else {
      // Was a drag but not enough for swipe, reset
      setDragOffset(0);
    }
    
    startPos.current = null;
    isDragging.current = false;
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    startPos.current = null;
    isDragging.current = false;
    setDragOffset(0);
  };

  return (
    <div
      className="card-view-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: `translateX(${dragOffset}px)`,
        transition: dragOffset === 0 ? 'transform 0.2s ease-out' : 'none',
      }}
    >
      <div className={`card-content ${isFlipped ? 'flipped' : ''}`}>
        <div className="card-side card-front">
          <p>{card.front}</p>
        </div>
        <div className="card-side card-back">
          <p>{card.back}</p>
        </div>
      </div>
      {isScoringSide && (
        <div className="swipe-hint">
          <span className="swipe-left">← Incorrect</span>
          <span className="swipe-right">Correct →</span>
        </div>
      )}
    </div>
  );
}

