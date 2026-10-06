/**
 * 锄大地 (Big Two / Big 2) Complete Rules Engine
 */

import { Card, CardHand, HandType, Suit } from '../types/game';

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
};

export const SUIT_NAMES: Record<Suit, string> = {
  spade: '黑桃',
  heart: '红桃',
  club: '草花',
  diamond: '方块',
};

export const SUIT_VALUES: Record<Suit, number> = {
  diamond: 1,
  club: 2,
  heart: 3,
  spade: 4,
};

export const RANK_DISPLAY: Record<string, string> = {
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A',
  '2': '2',
};

export const RANK_VALUES: Record<string, number> = {
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
  '2': 15,
};

// Create a standard 52-card deck for Big Two
export function createDeck(): Card[] {
  const suits: Suit[] = ['diamond', 'club', 'heart', 'spade'];
  const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      const rankVal = RANK_VALUES[rank];
      const suitVal = SUIT_VALUES[suit];
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        displayRank: RANK_DISPLAY[rank],
        rankValue: rankVal,
        suitValue: suitVal,
        totalValue: rankVal * 10 + suitVal,
        color: suit === 'heart' || suit === 'diamond' ? 'red' : 'black',
      });
    }
  }

  return deck;
}

// Fisher-Yates Shuffle
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Sort cards by total value ascending (3♦ ... 2♠)
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => a.totalValue - b.totalValue);
}

// Sort cards by rank value then suit
export function sortCardsByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
    return a.suitValue - b.suitValue;
  });
}

// Helper to check if 5 cards form a Straight (顺子)
function checkStraight(cards: Card[]): { isStraight: boolean; highestCard: Card | null } {
  if (cards.length !== 5) return { isStraight: false, highestCard: null };

  // Sort by rank value
  const sorted = [...cards].sort((a, b) => a.rankValue - b.rankValue);
  const ranks = sorted.map(c => c.rankValue);

  // Normal consecutive (e.g. 3-4-5-6-7 ... 10-J-Q-K-A)
  let isSequential = true;
  for (let i = 0; i < 4; i++) {
    if (ranks[i + 1] !== ranks[i] + 1) {
      isSequential = false;
      break;
    }
  }

  if (isSequential) {
    // Highest card is the last card in sorted array
    const highestCard = sorted.reduce((max, c) => (c.totalValue > max.totalValue ? c : max), sorted[4]);
    return { isStraight: true, highestCard };
  }

  // Special A-2-3-4-5 (ranks 14, 15, 3, 4, 5) or 2-3-4-5-6 (15, 3, 4, 5, 6)
  if (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 5 && ranks[3] === 14 && ranks[4] === 15) {
    // A-2-3-4-5, highest rank card is 2
    const highestCard = sorted.find(c => c.rankValue === 15) || sorted[4];
    return { isStraight: true, highestCard };
  }

  if (ranks[0] === 3 && ranks[1] === 4 && ranks[2] === 5 && ranks[3] === 6 && ranks[4] === 15) {
    // 2-3-4-5-6, highest card is 2
    const highestCard = sorted.find(c => c.rankValue === 15) || sorted[4];
    return { isStraight: true, highestCard };
  }

  return { isStraight: false, highestCard: null };
}

// Analyze any card selection and return valid Big Two CardHand, or null if invalid
export function analyzeHand(cards: Card[]): CardHand | null {
  if (!cards || cards.length === 0) return null;

  const count = cards.length;
  const sorted = sortCards(cards);

  // 1 Card: Single
  if (count === 1) {
    return {
      type: 'SINGLE',
      cards: sorted,
      categoryWeight: 1,
      primaryValue: sorted[0].rankValue,
      suitValue: sorted[0].suitValue,
    };
  }

  // 2 Cards: Pair
  if (count === 2) {
    if (sorted[0].rankValue === sorted[1].rankValue) {
      const maxSuit = Math.max(sorted[0].suitValue, sorted[1].suitValue);
      return {
        type: 'PAIR',
        cards: sorted,
        categoryWeight: 1,
        primaryValue: sorted[0].rankValue,
        suitValue: maxSuit,
      };
    }
    return null;
  }

  // 3 Cards: Triple
  if (count === 3) {
    if (sorted[0].rankValue === sorted[1].rankValue && sorted[1].rankValue === sorted[2].rankValue) {
      const maxSuit = Math.max(sorted[0].suitValue, sorted[1].suitValue, sorted[2].suitValue);
      return {
        type: 'TRIPLE',
        cards: sorted,
        categoryWeight: 1,
        primaryValue: sorted[0].rankValue,
        suitValue: maxSuit,
      };
    }
    return null;
  }

  // 5 Cards Combinations
  if (count === 5) {
    // Rank counts
    const rankCounts: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankCounts[c.rankValue]) rankCounts[c.rankValue] = [];
      rankCounts[c.rankValue].push(c);
    }

    const uniqueRanks = Object.keys(rankCounts).map(Number);
    const isFlush = sorted.every(c => c.suit === sorted[0].suit);
    const { isStraight, highestCard: straightHighest } = checkStraight(sorted);

    // 1. Straight Flush (同花顺)
    if (isFlush && isStraight && straightHighest) {
      return {
        type: 'STRAIGHT_FLUSH',
        cards: sorted,
        categoryWeight: 50,
        primaryValue: straightHighest.rankValue,
        suitValue: straightHighest.suitValue,
      };
    }

    // 2. Four of a Kind + 1 (铁支 / 四带一)
    if (uniqueRanks.length === 2) {
      for (const r of uniqueRanks) {
        if (rankCounts[r].length === 4) {
          const maxSuit = Math.max(...rankCounts[r].map(c => c.suitValue));
          return {
            type: 'FOUR_OF_A_KIND',
            cards: sorted,
            categoryWeight: 40,
            primaryValue: r,
            suitValue: maxSuit,
          };
        }
      }
    }

    // 3. Full House (葫芦)
    if (uniqueRanks.length === 2) {
      for (const r of uniqueRanks) {
        if (rankCounts[r].length === 3) {
          const maxSuit = Math.max(...rankCounts[r].map(c => c.suitValue));
          return {
            type: 'FULL_HOUSE',
            cards: sorted,
            categoryWeight: 30,
            primaryValue: r,
            suitValue: maxSuit,
          };
        }
      }
    }

    // 4. Flush (同花)
    if (isFlush) {
      const highestCard = sorted.reduce((max, c) => (c.totalValue > max.totalValue ? c : max), sorted[0]);
      return {
        type: 'FLUSH',
        cards: sorted,
        categoryWeight: 20,
        primaryValue: highestCard.rankValue,
        suitValue: highestCard.suitValue,
      };
    }

    // 5. Straight (顺子)
    if (isStraight && straightHighest) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        categoryWeight: 10,
        primaryValue: straightHighest.rankValue,
        suitValue: straightHighest.suitValue,
      };
    }

    return null;
  }

  return null;
}

// Determine if candidate hand can beat previous hand in Big Two
export function canBeat(prevHand: CardHand, candidateHand: CardHand): boolean {
  if (!prevHand || !candidateHand) return false;

  const prevCount = prevHand.cards.length;
  const candidateCount = candidateHand.cards.length;

  // Non-5-card hands MUST have matching card counts & hand types
  if (prevCount !== 5 || candidateCount !== 5) {
    if (prevCount !== candidateCount || prevHand.type !== candidateHand.type) {
      return false;
    }
    // Compare primary rank value, then suit value
    if (candidateHand.primaryValue > prevHand.primaryValue) return true;
    if (candidateHand.primaryValue === prevHand.primaryValue) {
      return candidateHand.suitValue > prevHand.suitValue;
    }
    return false;
  }

  // 5-Card Combinations Comparison
  if (candidateHand.categoryWeight > prevHand.categoryWeight) {
    return true; // Higher category beats lower (e.g. Full House beats Straight/Flush)
  }

  if (candidateHand.categoryWeight === prevHand.categoryWeight) {
    // Same category: compare primary value then suit value
    if (candidateHand.primaryValue > prevHand.primaryValue) return true;
    if (candidateHand.primaryValue === prevHand.primaryValue) {
      return candidateHand.suitValue > prevHand.suitValue;
    }
    return false;
  }

  return false;
}

// Get readable Chinese description for any played hand
export function getHandDescription(hand: CardHand): string {
  if (!hand) return '';

  switch (hand.type) {
    case 'SINGLE': {
      const c = hand.cards[0];
      return `单张 ${SUIT_SYMBOLS[c.suit]}${c.displayRank}`;
    }
    case 'PAIR': {
      const c = hand.cards[0];
      return `对子 ${SUIT_SYMBOLS[c.suit]}${c.displayRank}`;
    }
    case 'TRIPLE': {
      const c = hand.cards[0];
      return `三条 ${c.displayRank}`;
    }
    case 'STRAIGHT':
      return `顺子！`;
    case 'FLUSH': {
      const suit = hand.cards[0].suit;
      return `同花 (${SUIT_NAMES[suit]})！`;
    }
    case 'FULL_HOUSE':
      return `葫芦 (三带二)！`;
    case 'FOUR_OF_A_KIND':
      return `铁支 (四带一)！`;
    case 'STRAIGHT_FLUSH':
      return `同花顺！💣`;
    default:
      return '出牌';
  }
}
