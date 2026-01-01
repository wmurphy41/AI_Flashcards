import type { Card } from './api';
import type { SessionState } from './session';

export type CardOutcome = 'correct-first-time' | 'correct-on-retry' | 'missed' | 'unattempted';

/**
 * Classify a single card's outcome based on session state.
 * Uses card.uid as the identifier.
 * 
 * Rules:
 * - Correct First Time: correct in Cycle 1 (green wins - even if later incorrect)
 * - Correct On Retry: incorrect in Cycle 1 but correct in any later cycle
 * - Missed: incorrect in Cycle 1 and never correct by session end
 * - Unattempted: never scored at all
 */
export function classifyCardOutcome(
  card: Card,
  sessionState: SessionState
): CardOutcome {
  const cycle1Result = sessionState.cycle1Answers.get(card.uid);
  
  if (cycle1Result === undefined) {
    // Never scored - unattempted
    return 'unattempted';
  }
  
  if (cycle1Result === true) {
    // Correct on Cycle 1 - Correct First Time (green wins)
    return 'correct-first-time';
  }
  
  // Was incorrect on Cycle 1 - check if eventually got correct
  if (sessionState.incorrectCardIds.has(card.uid)) {
    // Still in incorrect set - never got correct
    return 'missed';
  } else {
    // Not in incorrect set but was wrong on cycle 1 - got correct later
    return 'correct-on-retry';
  }
}

/**
 * Compute outcomes for all cards in the deck.
 * 
 * @param deckCards - All cards from the deck
 * @param sessionState - Session state
 * @returns Map of card UID to outcome
 */
export function computeOutcomes(
  deckCards: Card[],
  sessionState: SessionState
): Map<string, CardOutcome> {
  const outcomes = new Map<string, CardOutcome>();
  
  for (const card of deckCards) {
    outcomes.set(card.uid, classifyCardOutcome(card, sessionState));
  }
  
  return outcomes;
}

/**
 * Calculate scores for the Results screen.
 * 
 * Right on First Try:
 * - numerator = count of cards scored in Cycle 1 that were correct in Cycle 1
 * - denominator = count of cards scored in Cycle 1
 * 
 * Overall Score:
 * - numerator = count of Attempted cards that were ever marked correct (in any cycle)
 * - denominator = count of Attempted cards
 * 
 * Unattempted cards are excluded from both denominators.
 */
export function computeScores(sessionState: SessionState): {
  rightOnFirstTry: { correct: number; total: number; percent: number };
  overallScore: { correct: number; total: number; percent: number };
} {
  // Right on First Try: cycle1Correct / cycle1Attempted
  const cycle1Attempted = sessionState.cycle1Answers.size;
  let cycle1Correct = 0;
  for (const wasCorrect of sessionState.cycle1Answers.values()) {
    if (wasCorrect) cycle1Correct++;
  }
  
  const rightOnFirstTry = {
    correct: cycle1Correct,
    total: cycle1Attempted,
    percent: cycle1Attempted === 0 ? 0 : Math.round((cycle1Correct / cycle1Attempted) * 100),
  };
  
  // Overall Score: everCorrect / attempted
  // Attempted = cards in cycle1Answers (all cards scored at least once)
  // Ever correct = cards that are either correct in cycle1 OR not in incorrectCardIds
  const attempted = sessionState.cycle1Answers.size;
  let everCorrect = 0;
  
  for (const [cardUid, wasCorrect] of sessionState.cycle1Answers.entries()) {
    if (wasCorrect) {
      // Correct on cycle 1 counts as ever correct
      everCorrect++;
    } else {
      // Was incorrect on cycle 1 - check if got correct later
      if (!sessionState.incorrectCardIds.has(cardUid)) {
        // Not in incorrect set means got correct in a later cycle
        everCorrect++;
      }
    }
  }
  
  const overallScore = {
    correct: everCorrect,
    total: attempted,
    percent: attempted === 0 ? 0 : Math.round((everCorrect / attempted) * 100),
  };
  
  return { rightOnFirstTry, overallScore };
}

/**
 * Compute breakdown counts by outcome type.
 */
export function computeBreakdown(
  deckCards: Card[],
  sessionState: SessionState
): {
  correctFirstTime: number;
  correctOnRetry: number;
  missed: number;
  unattempted: number;
} {
  const outcomes = computeOutcomes(deckCards, sessionState);
  
  let correctFirstTime = 0;
  let correctOnRetry = 0;
  let missed = 0;
  let unattempted = 0;
  
  for (const outcome of outcomes.values()) {
    switch (outcome) {
      case 'correct-first-time':
        correctFirstTime++;
        break;
      case 'correct-on-retry':
        correctOnRetry++;
        break;
      case 'missed':
        missed++;
        break;
      case 'unattempted':
        unattempted++;
        break;
    }
  }
  
  return {
    correctFirstTime,
    correctOnRetry,
    missed,
    unattempted,
  };
}

