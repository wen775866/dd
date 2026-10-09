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
  '2': '2',
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
};

// 按照用户设计的全新规则：A最大，2最小
// 2(2) < 3(3) < 4(4) < 5(5) < 6(6) < 7(7) < 8(8) < 9(9) < 10(10) < J(11) < Q(12) < K(13) < A(14)
export const RANK_VALUES: Record<string, number> = {
  '2': 2,
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
};

// Create a standard 52-card deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['diamond', 'club', 'heart', 'spade'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
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
// 用户定制顺子规则：
// 1. A-2-3-4-5 最大 (weight = 100)
// 2. 9-10-J-Q-K 第二大 (weight = 90)
// 3. 其它连续顺子：
//    8-9-10-J-Q (80)
//    7-8-9-10-J (70)
//    6-7-8-9-10 (60)
//    5-6-7-8-9 (50)
//    4-5-6-7-8 (40)
//    3-4-5-6-7 (30)
//    2-3-4-5-6 (20)
//    * 注意：不允许出 10-J-Q-K-A 顺子！
function checkStraight(cards: Card[]): { isStraight: boolean; highestCard: Card | null; straightWeight: number } {
  if (cards.length !== 5) return { isStraight: false, highestCard: null, straightWeight: 0 };

  // Sort by rank value (2=2, ..., A=14)
  const sorted = [...cards].sort((a, b) => a.rankValue - b.rankValue);
  const ranks = sorted.map(c => c.rankValue);

  // Case 1: A-2-3-4-5 (ranks: [2, 3, 4, 5, 14]) -> 顺子第一大！
  if (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 && ranks[3] === 5 && ranks[4] === 14) {
    const cardA = sorted.find(c => c.rankValue === 14)!;
    return { isStraight: true, highestCard: cardA, straightWeight: 100 };
  }

  // Case 2: 9-10-J-Q-K (ranks: [9, 10, 11, 12, 13]) -> 顺子第二大！
  if (ranks[0] === 9 && ranks[1] === 10 && ranks[2] === 11 && ranks[3] === 12 && ranks[4] === 13) {
    const cardK = sorted.find(c => c.rankValue === 13)!;
    return { isStraight: true, highestCard: cardK, straightWeight: 90 };
  }

  // Case 3: 10-J-Q-K-A (ranks: [10, 11, 12, 13, 14]) -> 用户明确规则：不允许出 10 J Q K A 的顺子！
  if (ranks[0] === 10 && ranks[1] === 11 && ranks[2] === 12 && ranks[3] === 13 && ranks[4] === 14) {
    return { isStraight: false, highestCard: null, straightWeight: 0 };
  }

  // Normal consecutive (e.g. 2-3-4-5-6 up to 8-9-10-J-Q)
  let isSequential = true;
  for (let i = 0; i < 4; i++) {
    if (ranks[i + 1] !== ranks[i] + 1) {
      isSequential = false;
      break;
    }
  }

  if (isSequential) {
    const topCard = sorted[4];
    return { isStraight: true, highestCard: topCard, straightWeight: topCard.rankValue * 5 };
  }

  return { isStraight: false, highestCard: null, straightWeight: 0 };
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

  // 4 Cards: 规则没有纯铁支，禁止出纯四张！
  if (count === 4) {
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
    const { isStraight, highestCard: straightHighest, straightWeight } = checkStraight(sorted);

    // 1. Straight Flush (同花顺): categoryWeight = 50
    // 用户规则：同花顺也是黑桃大于红桃大于梅花大于方块（例如黑桃同花顺23456比红桃56789大）
    // 花色相同再比同花顺顺子（A2345最大，9-10-J-Q-K第二大）
    if (isFlush && isStraight && straightHighest) {
      const flushSuitVal = sorted[0].suitValue; // 4=黑桃, 3=红桃, 2=梅花, 1=方块
      return {
        type: 'STRAIGHT_FLUSH',
        cards: sorted,
        categoryWeight: 50,
        primaryValue: flushSuitVal * 1000 + straightWeight,
        suitValue: flushSuitVal,
      };
    }

    // 2. Four of a Kind + 1 (四带一): categoryWeight = 40
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

    // 3. Full House / 俘虏 (三带二): categoryWeight = 30
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

    // 4. Flush (同花): categoryWeight = 20
    // 用户规则：黑桃大于红桃大于梅花大于方块，花色相同时比最大牌
    if (isFlush) {
      const highestCard = sorted.reduce((max, c) => (c.totalValue > max.totalValue ? c : max), sorted[0]);
      return {
        type: 'FLUSH',
        cards: sorted,
        categoryWeight: 20,
        primaryValue: highestCard.suitValue * 100 + highestCard.rankValue,
        suitValue: highestCard.suitValue,
      };
    }

    // 5. Straight (顺子): categoryWeight = 10
    // 用户规则：A2345最大 (100)，9 10 J Q K第二大 (90)，相同顺比最高单张花色
    if (isStraight && straightHighest) {
      return {
        type: 'STRAIGHT',
        cards: sorted,
        categoryWeight: 10,
        primaryValue: straightWeight,
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

  // Non-5-card hands MUST have matching card counts & hand types (单张/对子/三条)
  if (prevCount !== 5 || candidateCount !== 5) {
    if (prevCount !== candidateCount || prevHand.type !== candidateHand.type) {
      return false;
    }
    // Compare primary rank value, then suit value (黑桃 > 红桃 > 梅花 > 方块)
    if (candidateHand.primaryValue > prevHand.primaryValue) return true;
    if (candidateHand.primaryValue === prevHand.primaryValue) {
      return candidateHand.suitValue > prevHand.suitValue;
    }
    return false;
  }

  // 5-Card Combinations Comparison:
  // 同花顺(50) > 四带一(40) > 俘虏(30) > 同花(20) > 顺子(10)
  if (candidateHand.categoryWeight > prevHand.categoryWeight) {
    return true; // Higher category beats lower (e.g. 同花顺压一切5张)
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

// ---------------- SETTLEMENT & MULTIPLIER ALGORITHM ----------------
// Calculate Effective Cards count based on remaining cards multiplier rule:
// - 0 cards: 0 (Winner)
// - 1~7 cards: x1
// - 8~9 cards: x2 (8->16, 9->18)
// - 10~12 cards: x3 (10->30, 11->33, 12->36)
// - 13 cards (全关): x4 (13->52)
export function getEffectiveCards(rawCount: number): { effective: number; multiplier: number } {
  if (rawCount <= 0) return { effective: 0, multiplier: 0 };
  if (rawCount <= 7) return { effective: rawCount * 1, multiplier: 1 };
  if (rawCount <= 9) return { effective: rawCount * 2, multiplier: 2 };
  if (rawCount <= 12) return { effective: rawCount * 3, multiplier: 3 };
  return { effective: 13 * 4, multiplier: 4 }; // 52
}

export interface MatchSettlementItem {
  playerIndex: number;
  id: string;
  name: string;
  accumulatedCards: number;
  roundedCards: number;
  scoreDelta: number; // Net score change in card units
  coinChange: number; // scoreDelta * baseScore
  finalScore: number;
  formulaDesc: string; // e.g. "(60-80) + (110-80) + (30-80) = -40分"
}

// ---------------- MATCH FINAL SETTLEMENT ALGORITHM ----------------
// Triggered when any player's accumulated cards >= 100
// 1) Round each player's accumulated cards to nearest tens (四舍五入到十位: 84->80, 85->90)
// 2) Calculate pairwise score difference: Delta_i = Sum_{j != i} (Rounded_j - Rounded_i)
export function calculateMatchSettlement(
  players: { id: string; name: string; accumulatedCards: number; score: number }[],
  baseScore: number = 1000
): MatchSettlementItem[] {
  // Step 1: Round each player's accumulated cards to nearest 10
  const roundedList = players.map(p => {
    const acc = p.accumulatedCards || 0;
    const rounded = Math.round(acc / 10) * 10;
    return { acc, rounded };
  });

  // Step 2: Pairwise difference calculation
  return players.map((p, i) => {
    const { acc, rounded: r_i } = roundedList[i];
    let scoreDelta = 0;
    const terms: string[] = [];

    for (let j = 0; j < players.length; j++) {
      if (j !== i) {
        const r_j = roundedList[j].rounded;
        const diff = r_j - r_i;
        scoreDelta += diff;
        terms.push(`(${r_j}-${r_i})`);
      }
    }

    const coinChange = scoreDelta * baseScore;
    const finalScore = Math.max(0, p.score + coinChange);
    const formulaDesc = `${terms.join(' + ')} = ${scoreDelta > 0 ? '+' : ''}${scoreDelta}分`;

    return {
      playerIndex: i,
      id: p.id,
      name: p.name,
      accumulatedCards: acc,
      roundedCards: r_i,
      scoreDelta,
      coinChange,
      finalScore,
      formulaDesc,
    };
  });
}

export interface PlayerSettlement {
  playerIndex: number;
  id: string;
  name: string;
  rawCardCount: number;
  multiplier: number;
  effectiveCardCount: number;
  scoreDelta: number;
  coinChange: number;
  finalScore: number;
  formulaDesc: string;
}

export function calculateSettlement(
  players: { id: string; name: string; cards: { length: number }; score: number }[],
  winnerIndex: number,
  baseScore: number = 1000
): PlayerSettlement[] {
  // Step 1: Calculate Effective Cards for each player
  const effList = players.map(p => {
    const raw = p.cards ? p.cards.length : 0;
    return getEffectiveCards(raw);
  });

  // Step 2: Pairwise score difference calculation for each player i:
  // Delta_i = Sum_{j != i} (Effective_j - Effective_i)
  return players.map((p, i) => {
    const { effective: eff_i, multiplier: mult } = effList[i];
    const rawCount = p.cards ? p.cards.length : 0;
    let scoreDelta = 0;
    const terms: string[] = [];

    for (let j = 0; j < players.length; j++) {
      if (j !== i) {
        const eff_j = effList[j].effective;
        const diff = eff_j - eff_i;
        scoreDelta += diff;
        terms.push(`(${eff_j}-${eff_i})`);
      }
    }

    const coinChange = scoreDelta * baseScore;
    const finalScore = Math.max(0, p.score + coinChange);
    const formulaDesc = `${terms.join(' + ')} = ${scoreDelta > 0 ? '+' : ''}${scoreDelta} 分`;

    return {
      playerIndex: i,
      id: p.id,
      name: p.name,
      rawCardCount: rawCount,
      multiplier: mult,
      effectiveCardCount: eff_i,
      scoreDelta,
      coinChange,
      finalScore,
      formulaDesc,
    };
  });
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
      return `俘虏 (三带二)！`;
    case 'FOUR_OF_A_KIND':
      return `四带一！`;
    case 'STRAIGHT_FLUSH':
      return `同花顺！💣`;
    default:
      return '出牌';
  }
}
