import { Card, CardHand, Player } from '../types/game';
import { analyzeHand, canBeat, groupByValue, sortCards } from './doudizhuRules';

/**
 * Evaluates hand power score (Rocket, Bombs, Jokers, 2s, Aces)
 */
export function evaluateHandPower(cards: Card[]): number {
  let score = 0;
  const groups = groupByValue(cards);

  const hasBJ = cards.some(c => c.value === 16);
  const hasRJ = cards.some(c => c.value === 17);
  if (hasBJ && hasRJ) {
    score += 4.5;
  } else if (hasRJ) {
    score += 2.0;
  } else if (hasBJ) {
    score += 1.5;
  }

  const twos = cards.filter(c => c.value === 15).length;
  score += twos * 1.25;

  for (const [, list] of groups.entries()) {
    if (list.length === 4) {
      score += 3.0; // Bomb
    }
  }

  const aces = cards.filter(c => c.value === 14).length;
  score += aces * 0.4;

  return score;
}

export function aiShouldCallLandlord(cards: Card[]): boolean {
  return evaluateHandPower(cards) >= 3.8;
}

export function aiShouldRobLandlord(cards: Card[], robCount: number): boolean {
  return evaluateHandPower(cards) >= (4.8 + robCount * 1.2);
}

export function aiShouldDouble(cards: Card[], isLandlord: boolean): 'SUPER' | 'DOUBLE' | 'NONE' {
  const power = evaluateHandPower(cards);
  if (power >= 7.5) return 'SUPER';
  if (power >= 4.8) return 'DOUBLE';
  return 'NONE';
}

/**
 * AI Bidding decision
 */
export function calculateBid(cards: Card[], currentHighestBid: number): number {
  let score = 0;
  const groups = groupByValue(cards);

  // Check rocket
  const hasBlackJoker = cards.some(c => c.value === 16);
  const hasRedJoker = cards.some(c => c.value === 17);
  if (hasBlackJoker && hasRedJoker) {
    score += 4.5;
  } else if (hasRedJoker) {
    score += 2;
  } else if (hasBlackJoker) {
    score += 1.5;
  }

  // Count 2s
  const twos = cards.filter(c => c.value === 15).length;
  score += twos * 1.2;

  // Count bombs
  for (const [, list] of groups.entries()) {
    if (list.length === 4) {
      score += 3;
    }
  }

  // Count As
  const aces = cards.filter(c => c.value === 14).length;
  score += aces * 0.4;

  let desiredBid = 0;
  if (score >= 7.5) {
    desiredBid = 3;
  } else if (score >= 5.5) {
    desiredBid = 2;
  } else if (score >= 3.5) {
    desiredBid = 1;
  }

  if (desiredBid <= currentHighestBid) {
    return 0; // Pass
  }
  return desiredBid;
}

/**
 * Generate all possible hands in player's cards that can beat the target hand
 */
export function findBeatingHands(myCards: Card[], targetHand: CardHand): CardHand[] {
  const sorted = sortCards(myCards);
  const groups = groupByValue(sorted);
  const candidates: CardHand[] = [];

  // Helper to add if valid and beats
  const testCandidate = (cards: Card[]) => {
    const hand = analyzeHand(cards);
    if (hand && canBeat(targetHand, hand)) {
      candidates.push(hand);
    }
  };

  // 1. Same type candidates
  switch (targetHand.type) {
    case 'SINGLE': {
      for (const [val, list] of groups.entries()) {
        if (val > targetHand.mainValue) {
          testCandidate([list[0]]);
        }
      }
      break;
    }
    case 'PAIR': {
      for (const [val, list] of groups.entries()) {
        if (list.length >= 2 && val > targetHand.mainValue) {
          testCandidate(list.slice(0, 2));
        }
      }
      break;
    }
    case 'TRIO': {
      for (const [val, list] of groups.entries()) {
        if (list.length >= 3 && val > targetHand.mainValue) {
          testCandidate(list.slice(0, 3));
        }
      }
      break;
    }
    case 'TRIO_SINGLE': {
      for (const [val, list] of groups.entries()) {
        if (list.length >= 3 && val > targetHand.mainValue) {
          const trio = list.slice(0, 3);
          // Find single
          for (const [sVal, sList] of groups.entries()) {
            if (sVal !== val) {
              testCandidate([...trio, sList[0]]);
            }
          }
        }
      }
      break;
    }
    case 'TRIO_PAIR': {
      for (const [val, list] of groups.entries()) {
        if (list.length >= 3 && val > targetHand.mainValue) {
          const trio = list.slice(0, 3);
          for (const [pVal, pList] of groups.entries()) {
            if (pVal !== val && pList.length >= 2) {
              testCandidate([...trio, ...pList.slice(0, 2)]);
            }
          }
        }
      }
      break;
    }
    case 'STRAIGHT': {
      const len = targetHand.cards.length;
      const validVals: number[] = [];
      for (let v = 3; v <= 14; v++) {
        if (groups.has(v)) validVals.push(v);
      }
      for (let i = 0; i <= validVals.length - len; i++) {
        const slice = validVals.slice(i, i + len);
        let consecutive = true;
        for (let j = 0; j < slice.length - 1; j++) {
          if (slice[j + 1] - slice[j] !== 1) {
            consecutive = false;
            break;
          }
        }
        if (consecutive && slice[slice.length - 1] > targetHand.mainValue) {
          const straightCards = slice.map(v => groups.get(v)![0]);
          testCandidate(straightCards);
        }
      }
      break;
    }
    case 'CONSECUTIVE_PAIRS': {
      const pairCount = targetHand.length || targetHand.cards.length / 2;
      const pairVals: number[] = [];
      for (let v = 3; v <= 14; v++) {
        if (groups.has(v) && groups.get(v)!.length >= 2) {
          pairVals.push(v);
        }
      }
      for (let i = 0; i <= pairVals.length - pairCount; i++) {
        const slice = pairVals.slice(i, i + pairCount);
        let consecutive = true;
        for (let j = 0; j < slice.length - 1; j++) {
          if (slice[j + 1] - slice[j] !== 1) {
            consecutive = false;
            break;
          }
        }
        if (consecutive && slice[slice.length - 1] > targetHand.mainValue) {
          const pairCards: Card[] = [];
          slice.forEach(v => pairCards.push(...groups.get(v)!.slice(0, 2)));
          testCandidate(pairCards);
        }
      }
      break;
    }
    default:
      break;
  }

  // 2. Bombs
  for (const [, list] of groups.entries()) {
    if (list.length === 4) {
      testCandidate(list);
    }
  }

  // 3. Rocket
  const bj = sorted.find(c => c.value === 16);
  const rj = sorted.find(c => c.value === 17);
  if (bj && rj) {
    testCandidate([rj, bj]);
  }

  return candidates;
}

/**
 * AI chooses cards to lead when it's their free turn
 */
export function chooseLeadingCards(myCards: Card[]): Card[] {
  const sorted = sortCards(myCards);
  const groups = groupByValue(sorted);

  // If only 1 or 2 cards left, play them!
  if (sorted.length <= 2) {
    const hand = analyzeHand(sorted);
    if (hand) return sorted;
    return [sorted[sorted.length - 1]];
  }

  // Try straights
  const straightVals: number[] = [];
  for (let v = 3; v <= 14; v++) {
    if (groups.has(v)) straightVals.push(v);
  }
  for (let len = 7; len >= 5; len--) {
    for (let i = 0; i <= straightVals.length - len; i++) {
      const slice = straightVals.slice(i, i + len);
      let consecutive = true;
      for (let j = 0; j < slice.length - 1; j++) {
        if (slice[j + 1] - slice[j] !== 1) {
          consecutive = false;
          break;
        }
      }
      if (consecutive) {
        return slice.map(v => groups.get(v)![0]);
      }
    }
  }

  // Try consecutive pairs
  const pairVals: number[] = [];
  for (let v = 3; v <= 14; v++) {
    if (groups.has(v) && groups.get(v)!.length >= 2) pairVals.push(v);
  }
  if (pairVals.length >= 3) {
    for (let i = 0; i <= pairVals.length - 3; i++) {
      const slice = pairVals.slice(i, i + 3);
      if (slice[1] === slice[0] + 1 && slice[2] === slice[1] + 1) {
        const res: Card[] = [];
        slice.forEach(v => res.push(...groups.get(v)!.slice(0, 2)));
        return res;
      }
    }
  }

  // Try Trio with Single or Pair
  const trioEntries = Array.from(groups.entries())
    .filter(([val, list]) => list.length >= 3 && val < 15)
    .sort((a, b) => a[0] - b[0]);

  if (trioEntries.length > 0) {
    const [tVal, tList] = trioEntries[0];
    const trio = tList.slice(0, 3);
    // Find lowest single
    const singleEntries = Array.from(groups.entries())
      .filter(([val, list]) => val !== tVal && list.length === 1 && val < 15)
      .sort((a, b) => a[0] - b[0]);
    if (singleEntries.length > 0) {
      return [...trio, singleEntries[0][1][0]];
    }
    // Find lowest pair
    const pEntries = Array.from(groups.entries())
      .filter(([val, list]) => val !== tVal && list.length === 2 && val < 14)
      .sort((a, b) => a[0] - b[0]);
    if (pEntries.length > 0) {
      return [...trio, ...pEntries[0][1].slice(0, 2)];
    }
    return trio;
  }

  // Try lowest pair (excluding 2s and bombs)
  const nonBombPairs = Array.from(groups.entries())
    .filter(([val, list]) => list.length === 2 && val < 15)
    .sort((a, b) => a[0] - b[0]);

  if (nonBombPairs.length > 0) {
    return nonBombPairs[0][1].slice(0, 2);
  }

  // Try lowest single (excluding 2s, jokers)
  const singles = Array.from(groups.entries())
    .filter(([val, list]) => list.length === 1 && val < 15)
    .sort((a, b) => a[0] - b[0]);

  if (singles.length > 0) {
    return [singles[0][1][0]];
  }

  // Fallback: pick smallest card
  return [sorted[sorted.length - 1]];
}

/**
 * AI chooses cards to respond
 */
export function aiChoosePlay(
  myPlayer: Player,
  myCards: Card[],
  lastHand: { playerId: string; hand: CardHand } | null,
  allPlayers: Player[]
): Card[] {
  // If free turn
  if (!lastHand) {
    return chooseLeadingCards(myCards);
  }

  const beatingHands = findBeatingHands(myCards, lastHand.hand);
  if (beatingHands.length === 0) {
    return []; // Pass
  }

  const lastPlayer = allPlayers.find(p => p.id === lastHand.playerId);
  const isTeammate =
    myPlayer.role === 'FARMER' && lastPlayer && lastPlayer.role === 'FARMER';

  // If last player is teammate Farmer
  if (isTeammate) {
    // If teammate's hand is already strong or teammate has very few cards, don't beat them!
    if (lastHand.hand.mainValue >= 13 || (lastPlayer && lastPlayer.cards.length <= 3)) {
      return []; // Let partner pass through
    }
    // Only beat if we have a natural clean takeover without wasting bombs
    const nonBomb = beatingHands.filter(h => h.type !== 'BOMB' && h.type !== 'ROCKET');
    if (nonBomb.length > 0) {
      // Pick smallest
      nonBomb.sort((a, b) => a.mainValue - b.mainValue);
      return nonBomb[0].cards;
    }
    return []; // Pass, don't bomb teammate
  }

  // Opponent played:
  // Sort beating hands: prioritize non-bombs with lowest mainValue, then lowest bomb
  const nonBombs = beatingHands.filter(h => h.type !== 'BOMB' && h.type !== 'ROCKET');
  if (nonBombs.length > 0) {
    nonBombs.sort((a, b) => a.mainValue - b.mainValue);
    return nonBombs[0].cards;
  }

  // Only bombs left:
  // Only bomb if opponent has <= 5 cards left, or last hand is a high combo, or last hand was a bomb
  const opponent = lastPlayer;
  const opponentDanger = opponent && opponent.cards.length <= 5;
  const isBombBattle = lastHand.hand.type === 'BOMB';

  if (opponentDanger || isBombBattle || myCards.length <= 4) {
    const bombs = beatingHands.filter(h => h.type === 'BOMB');
    if (bombs.length > 0) {
      bombs.sort((a, b) => a.mainValue - b.mainValue);
      return bombs[0].cards;
    }
    const rocket = beatingHands.find(h => h.type === 'ROCKET');
    if (rocket) {
      return rocket.cards;
    }
  }

  return []; // Pass to save bombs
}
