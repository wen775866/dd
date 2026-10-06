import { Card, CardHand, HandType, Suit } from '../types/game';

// Display symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '♠',
  heart: '♥',
  club: '♣',
  diamond: '♦',
  joker: '★',
};

// Generate full standard 54 cards deck
export function createDeck(): Card[] {
  const suits: Suit[] = ['spade', 'heart', 'club', 'diamond'];
  const rankDefs: Array<{ rank: string; value: number }> = [
    { rank: '3', value: 3 },
    { rank: '4', value: 4 },
    { rank: '5', value: 5 },
    { rank: '6', value: 6 },
    { rank: '7', value: 7 },
    { rank: '8', value: 8 },
    { rank: '9', value: 9 },
    { rank: '10', value: 10 },
    { rank: 'J', value: 11 },
    { rank: 'Q', value: 12 },
    { rank: 'K', value: 13 },
    { rank: 'A', value: 14 },
    { rank: '2', value: 15 },
  ];

  const deck: Card[] = [];

  for (const r of rankDefs) {
    for (const s of suits) {
      deck.push({
        id: `${s}-${r.rank}`,
        suit: s,
        rank: r.rank,
        displayRank: r.rank,
        value: r.value,
        color: s === 'heart' || s === 'diamond' ? 'red' : 'black',
      });
    }
  }

  // Black Joker (小王)
  deck.push({
    id: 'joker-black',
    suit: 'joker',
    rank: 'BJ',
    displayRank: '小王',
    value: 16,
    color: 'black',
  });

  // Red Joker (大王)
  deck.push({
    id: 'joker-red',
    suit: 'joker',
    rank: 'RJ',
    displayRank: '大王',
    value: 17,
    color: 'red',
  });

  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 不洗牌模式切牌：保留连牌与炸弹聚集度，倍数超爽
export function createNoShuffleDeck(): Card[] {
  const base = createDeck();
  let arr = [...base];
  const cuts = 4 + Math.floor(Math.random() * 3);
  for (let c = 0; c < cuts; c++) {
    const cutPoint = 15 + Math.floor(Math.random() * 25);
    arr = [...arr.slice(cutPoint), ...arr.slice(0, cutPoint)];
  }
  return arr;
}

// Sort cards: descending by value, then suit
export function sortCards(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    joker: 4,
    spade: 3,
    heart: 2,
    club: 1,
    diamond: 0,
  };

  return [...cards].sort((a, b) => {
    if (a.value !== b.value) {
      return b.value - a.value;
    }
    return suitOrder[b.suit] - suitOrder[a.suit];
  });
}

// Helper: group cards by value
export function groupByValue(cards: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>();
  for (const c of cards) {
    const list = map.get(c.value) || [];
    list.push(c);
    map.set(c.value, list);
  }
  return map;
}

// Check if array of values is consecutive, each diff is 1, and no value >= 15 (2, BJ, RJ cannot be in straight)
function isConsecutive(vals: number[]): boolean {
  if (vals.length === 0) return false;
  for (const v of vals) {
    if (v >= 15) return false; // 2 or jokers forbidden
  }
  const sorted = [...vals].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] - sorted[i] !== 1) return false;
  }
  return true;
}

/**
 * Determine the hand type and main comparison value.
 * Returns CardHand or null if invalid combination.
 */
export function analyzeHand(cards: Card[]): CardHand | null {
  if (!cards || cards.length === 0) return null;
  const sorted = sortCards(cards);
  const len = sorted.length;
  const groups = groupByValue(sorted);

  // 1 card: Single
  if (len === 1) {
    return {
      type: 'SINGLE',
      cards: sorted,
      mainValue: sorted[0].value,
    };
  }

  // 2 cards: Pair or Rocket
  if (len === 2) {
    if (sorted[0].value === 17 && sorted[1].value === 16) {
      return {
        type: 'ROCKET',
        cards: sorted,
        mainValue: 17,
      };
    }
    if (sorted[0].value === sorted[1].value) {
      return {
        type: 'PAIR',
        cards: sorted,
        mainValue: sorted[0].value,
      };
    }
    return null;
  }

  // 3 cards: Trio
  if (len === 3) {
    if (groups.size === 1) {
      return {
        type: 'TRIO',
        cards: sorted,
        mainValue: sorted[0].value,
      };
    }
    return null;
  }

  // 4 cards: Bomb or Trio with single
  if (len === 4) {
    if (groups.size === 1) {
      return {
        type: 'BOMB',
        cards: sorted,
        mainValue: sorted[0].value,
      };
    }
    // Trio + Single
    for (const [val, list] of groups.entries()) {
      if (list.length === 3) {
        return {
          type: 'TRIO_SINGLE',
          cards: sorted,
          mainValue: val,
        };
      }
    }
    return null;
  }

  // 5 cards: Trio with pair, or Straight of 5
  if (len === 5) {
    // Trio + Pair
    if (groups.size === 2) {
      let trioVal = 0;
      let hasPair = false;
      for (const [val, list] of groups.entries()) {
        if (list.length === 3) trioVal = val;
        if (list.length === 2) hasPair = true;
      }
      if (trioVal > 0 && hasPair) {
        return {
          type: 'TRIO_PAIR',
          cards: sorted,
          mainValue: trioVal,
        };
      }
    }
  }

  // Check Straight (顺子): length >= 5, all single counts, consecutive <= A (14)
  if (len >= 5 && groups.size === len) {
    const vals = Array.from(groups.keys());
    if (isConsecutive(vals)) {
      const maxVal = Math.max(...vals);
      return {
        type: 'STRAIGHT',
        cards: sorted,
        mainValue: maxVal,
        length: len,
      };
    }
  }

  // Check Consecutive Pairs (连对): length >= 6, length is even, all counts == 2, consecutive
  if (len >= 6 && len % 2 === 0) {
    let allPairs = true;
    const vals: number[] = [];
    for (const [val, list] of groups.entries()) {
      if (list.length !== 2) {
        allPairs = false;
        break;
      }
      vals.push(val);
    }
    if (allPairs && vals.length >= 3 && isConsecutive(vals)) {
      return {
        type: 'CONSECUTIVE_PAIRS',
        cards: sorted,
        mainValue: Math.max(...vals),
        length: vals.length,
      };
    }
  }

  // Check Four with Two (四带二)
  // 6 cards: 4 of same + 2 single cards (can be distinct or pair)
  if (len === 6) {
    for (const [val, list] of groups.entries()) {
      if (list.length === 4) {
        return {
          type: 'FOUR_TWO_SINGLES',
          cards: sorted,
          mainValue: val,
        };
      }
    }
  }
  // 8 cards: 4 of same + 2 pairs (groups must have one 4 and two 2s, or two 4s)
  if (len === 8) {
    let fourVal = 0;
    let pairsCount = 0;
    for (const [val, list] of groups.entries()) {
      if (list.length === 4) {
        fourVal = val;
      } else if (list.length === 2) {
        pairsCount++;
      }
    }
    if (fourVal > 0 && pairsCount === 2) {
      return {
        type: 'FOUR_TWO_PAIRS',
        cards: sorted,
        mainValue: fourVal,
      };
    }
  }

  // Check Airplane (飞机)
  // Extract all trio values that are consecutive
  const trioVals: number[] = [];
  for (const [val, list] of groups.entries()) {
    if (list.length >= 3 && val < 15) {
      trioVals.push(val);
    }
  }
  trioVals.sort((a, b) => a - b);

  // Find longest consecutive trio sub-sequence
  const findConsecutiveSubsequences = (arr: number[]): number[][] => {
    const res: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const sub = [arr[i]];
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[j] === sub[sub.length - 1] + 1) {
          sub.push(arr[j]);
        } else {
          break;
        }
      }
      if (sub.length >= 2) {
        res.push(sub);
      }
    }
    return res;
  };

  const consecutiveTrios = findConsecutiveSubsequences(trioVals);

  for (const seq of consecutiveTrios) {
    const numTrios = seq.length;

    // 1. Pure airplane (no wings): length === numTrios * 3
    if (len === numTrios * 3) {
      return {
        type: 'AIRPLANE',
        cards: sorted,
        mainValue: Math.max(...seq),
        length: numTrios,
      };
    }

    // 2. Airplane with singles: length === numTrios * 4
    if (len === numTrios * 4) {
      return {
        type: 'AIRPLANE_SINGLES',
        cards: sorted,
        mainValue: Math.max(...seq),
        length: numTrios,
      };
    }

    // 3. Airplane with pairs: length === numTrios * 5
    // Must verify the remaining cards form exactly numTrios pairs
    if (len === numTrios * 5) {
      // Remaining cards check
      const remainingCards = sorted.filter(c => !seq.includes(c.value));
      const remGroups = groupByValue(remainingCards);
      let remPairsCount = 0;
      let valid = true;
      for (const [, list] of remGroups.entries()) {
        if (list.length === 2) {
          remPairsCount += 1;
        } else if (list.length === 4) {
          remPairsCount += 2;
        } else {
          valid = false;
          break;
        }
      }
      if (valid && remPairsCount === numTrios) {
        return {
          type: 'AIRPLANE_PAIRS',
          cards: sorted,
          mainValue: Math.max(...seq),
          length: numTrios,
        };
      }
    }
  }

  return null;
}

/**
 * Check if candidate hand can beat the previous hand.
 */
export function canBeat(prevHand: CardHand, candidateHand: CardHand): boolean {
  // Rocket beats everything
  if (candidateHand.type === 'ROCKET') {
    return true;
  }
  if (prevHand.type === 'ROCKET') {
    return false;
  }

  // Bomb beats anything except Rocket and higher Bomb
  if (candidateHand.type === 'BOMB') {
    if (prevHand.type !== 'BOMB') {
      return true;
    }
    return candidateHand.mainValue > prevHand.mainValue;
  }

  // If candidate is not a bomb or rocket, it must match type and length
  if (prevHand.type === 'BOMB') {
    return false;
  }

  if (candidateHand.type !== prevHand.type) {
    return false;
  }

  // Length must match for straights, consecutive pairs, and airplanes
  if (candidateHand.length !== prevHand.length) {
    return false;
  }
  if (candidateHand.cards.length !== prevHand.cards.length) {
    return false;
  }

  return candidateHand.mainValue > prevHand.mainValue;
}

// Convert rank value to Chinese label
export function getRankLabel(val: number): string {
  if (val === 17) return '大王';
  if (val === 16) return '小王';
  if (val === 15) return '2';
  if (val === 14) return 'A';
  if (val === 13) return 'K';
  if (val === 12) return 'Q';
  if (val === 11) return 'J';
  return val.toString();
}

// Get descriptive Chinese name for a played hand
export function getHandDescription(hand: CardHand): string {
  switch (hand.type) {
    case 'ROCKET':
      return '🚀 王炸 (双王)';
    case 'BOMB':
      return `💣 炸弹 [${getRankLabel(hand.mainValue)}]`;
    case 'SINGLE':
      return `单张 [${getRankLabel(hand.mainValue)}]`;
    case 'PAIR':
      return `对子 [${getRankLabel(hand.mainValue)}]`;
    case 'TRIO':
      return `三张 [${getRankLabel(hand.mainValue)}]`;
    case 'TRIO_SINGLE':
      return `三带一 [${getRankLabel(hand.mainValue)}]`;
    case 'TRIO_PAIR':
      return `三带二 [${getRankLabel(hand.mainValue)}]`;
    case 'STRAIGHT':
      return `顺子 [${hand.cards.length}张]`;
    case 'CONSECUTIVE_PAIRS':
      return `连对 [${hand.length || hand.cards.length / 2}连对]`;
    case 'AIRPLANE':
      return `✈️ 飞机不带`;
    case 'AIRPLANE_SINGLES':
      return `✈️ 飞机带单牌`;
    case 'AIRPLANE_PAIRS':
      return `✈️ 飞机带对子`;
    case 'FOUR_TWO_SINGLES':
      return `四带二单 [${getRankLabel(hand.mainValue)}]`;
    case 'FOUR_TWO_PAIRS':
      return `四带两对 [${getRankLabel(hand.mainValue)}]`;
    case 'PASS':
      return '不出';
    default:
      return '未知牌型';
  }
}

/**
 * Sort cards by pattern/frequency: Bombs (4) -> Trios (3) -> Pairs (2) -> Singles (1)
 */
export function sortCardsByPattern(cards: Card[]): Card[] {
  const groups = groupByValue(cards);
  return [...cards].sort((a, b) => {
    const countA = groups.get(a.value)?.length || 1;
    const countB = groups.get(b.value)?.length || 1;
    if (countA !== countB) {
      return countB - countA;
    }
    if (a.value !== b.value) {
      return b.value - a.value;
    }
    return 0;
  });
}
