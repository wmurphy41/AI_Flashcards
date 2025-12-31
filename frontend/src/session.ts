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
 * Cycle 1: all cards in original order
 * Cycles 2-4: only incorrect cards, in same relative order as original deck
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
 * Initialize session state for a deck
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
 * Apply an answer and return new state
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
    newIncorrectIds.delete(cardId);
  }
  
  // Track Cycle 1 answers for scoring
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
 * Check if we should advance to next cycle or end session
 */
export function shouldAdvanceCycle(state: SessionState, allCards: Card[]): {
  shouldAdvance: boolean;
  shouldEnd: boolean;
} {
  const isLastCard = state.currentCardIndex >= state.cycleQueue.length;
  
  if (!isLastCard) {
    return { shouldAdvance: false, shouldEnd: false };
  }
  
  // Last card of cycle
  if (state.incorrectCardIds.size === 0) {
    // No incorrect cards, end session
    return { shouldAdvance: false, shouldEnd: true };
  }
  
  if (state.cycle >= 4) {
    // Max cycles reached, end session
    return { shouldAdvance: false, shouldEnd: true };
  }
  
  // Advance to next cycle
  return { shouldAdvance: true, shouldEnd: false };
}

/**
 * Start next cycle with incorrect cards
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
 * Calculate Cycle 1 score
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

