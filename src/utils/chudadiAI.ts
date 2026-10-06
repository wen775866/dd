/**
 * 锄大地 (Big Two) AI Decision Engine
 */

import { Card, CardHand, Player } from '../types/game';
import {
  analyzeHand,
  canBeat,
  sortCards,
} from './chudadiRules';

// Search all valid combinations in hand that can beat target hand
export function findBeatingHands(cards: Card[], prevHand: CardHand): CardHand[] {
  if (!cards || cards.length === 0 || !prevHand) return [];

  const candidates: CardHand[] = [];
  const sorted = sortCards(cards);
  const reqCount = prevHand.cards.length;

  // Single
  if (reqCount === 1) {
    for (const c of sorted) {
      const h = analyzeHand([c]);
      if (h && canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
    return candidates;
  }

  // Pair
  if (reqCount === 2) {
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i].rankValue === sorted[j].rankValue) {
          const h = analyzeHand([sorted[i], sorted[j]]);
          if (h && canBeat(prevHand, h)) {
            candidates.push(h);
          }
        }
      }
    }
    return candidates;
  }

  // Triple
  if (reqCount === 3) {
    for (let i = 0; i < sorted.length - 2; i++) {
      for (let j = i + 1; j < sorted.length - 1; j++) {
        for (let k = j + 1; k < sorted.length; k++) {
          if (sorted[i].rankValue === sorted[j].rankValue && sorted[j].rankValue === sorted[k].rankValue) {
            const h = analyzeHand([sorted[i], sorted[j], sorted[k]]);
            if (h && canBeat(prevHand, h)) {
              candidates.push(h);
            }
          }
        }
      }
    }
    return candidates;
  }

  // 5-Card Combos
  if (reqCount === 5 && sorted.length >= 5) {
    // Generate 5-card subsets
    const combinations: Card[][] = [];
    const n = sorted.length;

    function kCombos(start: number, combo: Card[]) {
      if (combo.length === 5) {
        combinations.push([...combo]);
        return;
      }
      for (let i = start; i < n; i++) {
        combo.push(sorted[i]);
        kCombos(i + 1, combo);
        combo.pop();
        if (combinations.length > 150) break; // Cap search space for performance
      }
    }

    kCombos(0, []);

    for (const combo of combinations) {
      const h = analyzeHand(combo);
      if (h && canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
  }

  // Sort candidates so AI prefers playing lower value beating hands
  return candidates.sort((a, b) => {
    if (a.categoryWeight !== b.categoryWeight) return a.categoryWeight - b.categoryWeight;
    if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
    return a.suitValue - b.suitValue;
  });
}

// AI chooses opening hand when leading trick
export function chooseLeadingCards(
  cards: Card[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-3'
): Card[] {
  if (!cards || cards.length === 0) return [];

  const sorted = sortCards(cards);

  // If first trick of first round, lead hand MUST include starter card (3♦)
  if (isFirstTrick) {
    const starterCard = sorted.find(c => c.id === starterCardId);
    if (starterCard) {
      // Look for 5-card combo containing starter
      if (sorted.length >= 5) {
        for (let i = 0; i < sorted.length - 4; i++) {
          const combo = sorted.slice(i, i + 5);
          if (combo.some(c => c.id === starterCardId)) {
            const h = analyzeHand(combo);
            if (h) return h.cards;
          }
        }
      }

      // Look for pair containing starter
      const sameRankPair = sorted.filter(c => c.rankValue === starterCard.rankValue);
      if (sameRankPair.length >= 2) {
        const pair = sameRankPair.slice(0, 2);
        const h = analyzeHand(pair);
        if (h) return h.cards;
      }

      // Single 3♦
      return [starterCard];
    }
  }

  // General Lead Strategy:
  // 1. Check for lowest 5-card combination
  if (sorted.length >= 5) {
    for (let i = 0; i <= sorted.length - 5; i++) {
      const combo = sorted.slice(i, i + 5);
      const h = analyzeHand(combo);
      if (h && h.categoryWeight <= 30) {
        return h.cards;
      }
    }
  }

  // 2. Check for lowest pair
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rankValue === sorted[i + 1].rankValue) {
      const pair = [sorted[i], sorted[i + 1]];
      const h = analyzeHand(pair);
      if (h && sorted[i].rankValue <= 12) { // 3..Q pairs
        return h.cards;
      }
    }
  }

  // 3. Play lowest single card
  return [sorted[0]];
}

// AI Main Play decision entry point
export function aiChoosePlay(
  player: Player,
  cards: Card[],
  lastValidHand: { playerId: string; hand: CardHand } | null,
  players: Player[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-3'
): Card[] {
  // If AI is leading the trick (no last valid hand or AI is the trick leader)
  if (!lastValidHand || lastValidHand.playerId === player.id) {
    return chooseLeadingCards(cards, isFirstTrick, starterCardId);
  }

  // AI is responding to opponent's hand
  const beatingCandidates = findBeatingHands(cards, lastValidHand.hand);
  if (beatingCandidates.length === 0) {
    return []; // Pass
  }

  // Smart conserve logic:
  // If opponent played a single card and AI's only beating candidate is a 2 (rankValue=15),
  // and AI has more than 3 cards left, AI might pass to keep the 2 for endgame!
  const chosen = beatingCandidates[0];
  if (
    lastValidHand.hand.type === 'SINGLE' &&
    chosen.cards[0].rankValue === 15 &&
    cards.length > 4 &&
    Math.random() < 0.4
  ) {
    return []; // Pass
  }

  return chosen.cards;
}
