import type { Card } from './api';

export type SessionState = {
  cycle: number;
  currentCardIndex: number;
  cycleQueue: Card[];
  incorrectCardIds: Set<string>;
  cycle1Answers: Map<string, boolean>; // cardId -> wasCorrect
};

export type SessionAction = 
  | { type: 'ANSWER'; cardId: string; wasCorrect: boolean }
  | { type: 'NEXT_CYCLE' };

/**
 * Build the queue of cards for a cycle.
 * 
 * Cycle 1: Returns all cards in their original order from the deck.
 * Cycles 2-4: Returns only cards that were marked incorrect, maintaining
 *              the same relative order as they appeared in the original deck.
 * 
 * @param allCards - All cards from the deck in original order
 * @param incorrectCardIds - Set of card IDs that were answered incorrectly
 * @param cycle - Current cycle number (1-4)
 * @returns Array of cards to study in this cycle
 */
export function buildCycleQueue(
  allCards: Card[],
  incorrectCardIds: Set<string>,
  cycle: number
): Card[] {
  if (cycle === 1) {
    return [...allCards];
  }
  
  // For cycles 2-4, return only incorrect cards in original order
  return allCards.filter(card => incorrectCardIds.has(card.id));
}

/**
 * Initialize session state for a deck.
 * 
 * Creates a new study session starting at cycle 1 with all cards
 * in the original deck order.
 * 
 * @param deckCards - Array of cards from the deck
 * @returns Initial session state
 */
export function initSession(deckCards: Card[]): SessionState {
  return {
    cycle: 1,
    currentCardIndex: 0,
    cycleQueue: buildCycleQueue(deckCards, new Set(), 1),
    incorrectCardIds: new Set(),
    cycle1Answers: new Map(),
  };
}

/**
 * Apply an answer to a card and return updated session state.
 * 
 * Updates the incorrect cards set and tracks Cycle 1 answers for scoring.
 * Advances to the next card index.
 * 
 * @param state - Current session state
 * @param cardId - ID of the card that was answered
 * @param wasCorrect - Whether the answer was correct
 * @returns New session state with updated answer tracking
 */
export function applyAnswer(
  state: SessionState,
  cardId: string,
  wasCorrect: boolean
): SessionState {
  const newIncorrectIds = new Set(state.incorrectCardIds);
  
  if (!wasCorrect) {
    newIncorrectIds.add(cardId);
  } else {
    // Remove from incorrect set if it was previously incorrect
    newIncorrectIds.delete(cardId);
  }
  
  // Track Cycle 1 answers for scoring (only cycle 1 counts toward final score)
  const newCycle1Answers = new Map(state.cycle1Answers);
  if (state.cycle === 1) {
    newCycle1Answers.set(cardId, wasCorrect);
  }
  
  const nextIndex = state.currentCardIndex + 1;
  
  return {
    ...state,
    currentCardIndex: nextIndex,
    incorrectCardIds: newIncorrectIds,
    cycle1Answers: newCycle1Answers,
  };
}

/**
 * Determine if the session should advance to the next cycle or end.
 * 
 * Session ends if:
 * - All cards are correct (no incorrect cards remaining), OR
 * - Maximum cycles (4) have been reached
 * 
 * Session advances to next cycle if:
 * - Current cycle is complete (last card answered), AND
 * - There are incorrect cards remaining, AND
 * - Current cycle is less than 4
 * 
 * @param state - Current session state
 * @param _allCards - All cards from the deck (currently unused, reserved for future validation)
 * @returns Object indicating whether to advance cycle or end session
 */
export function shouldAdvanceCycle(state: SessionState, _allCards: Card[]): {
  shouldAdvance: boolean;
  shouldEnd: boolean;
} {
  const isLastCard = state.currentCardIndex >= state.cycleQueue.length;
  
  if (!isLastCard) {
    return { shouldAdvance: false, shouldEnd: false };
  }
  
  // Last card of cycle - check if we should end or continue
  if (state.incorrectCardIds.size === 0) {
    // All cards correct - end session early
    return { shouldAdvance: false, shouldEnd: true };
  }
  
  if (state.cycle >= 4) {
    // Maximum cycles reached - end session
    return { shouldAdvance: false, shouldEnd: true };
  }
  
  // Advance to next cycle with remaining incorrect cards
  return { shouldAdvance: true, shouldEnd: false };
}

/**
 * Start the next cycle with only the cards that were incorrect.
 * 
 * Resets the card index to 0 and builds a new queue containing
 * only the cards that need more practice.
 * 
 * @param state - Current session state
 * @param allCards - All cards from the deck in original order
 * @returns Updated session state for the new cycle
 */
export function startNextCycle(state: SessionState, allCards: Card[]): SessionState {
  const nextCycle = state.cycle + 1;
  const nextQueue = buildCycleQueue(allCards, state.incorrectCardIds, nextCycle);
  
  return {
    ...state,
    cycle: nextCycle,
    currentCardIndex: 0,
    cycleQueue: nextQueue,
  };
}

/**
 * Calculate the Cycle 1 score for display on results screen.
 * 
 * Only Cycle 1 answers count toward the final score. This provides
 * a consistent baseline metric regardless of how many retry cycles
 * were needed.
 * 
 * @param state - Session state containing Cycle 1 answers
 * @returns Object with correct count, total count, and percentage
 */
export function calculateCycle1Score(state: SessionState): {
  correct: number;
  total: number;
  percent: number;
} {
  const total = state.cycle1Answers.size;
  if (total === 0) {
    return { correct: 0, total: 0, percent: 0 };
  }
  
  let correct = 0;
  for (const wasCorrect of state.cycle1Answers.values()) {
    if (wasCorrect) correct++;
  }
  
  const percent = Math.round((correct / total) * 100);
  return { correct, total, percent };
}

