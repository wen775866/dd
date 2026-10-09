/**
 * 锄大地 (Big Two / 盐三) 宗师级 AI 决策与智能托管引擎
 * 针对定制规则进行全方位深度优化与战术博弈建模：
 * 
 * 规则核心特性：
 * 1. 点数大小：A最大(14)，2最小(2) -> 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A
 * 2. 花色大小：黑桃(4) > 红桃(3) > 草花(2) > 方块(1)
 * 3. 牌皇王牌：♠A 为全场绝对最大单张 (Boss Card)
 * 4. 顺子规则：A-2-3-4-5 最大 (100)，9-10-J-Q-K 第二大 (90)，10-J-Q-K-A (85)
 * 5. 五张牌型：同花顺(50) > 四带一(40) > 俘虏/葫芦(30) > 同花(20) > 顺子(10)
 * 6. 结算惩罚倍数：
 *    - 0张: 0分 (赢家)
 *    - 1~7张: 1倍
 *    - 8~9张: 2倍
 *    - 10~12张: 3倍
 *    - 13张: 4倍 (全关/大关)
 * 
 * 宗师级战术特性：
 * - 全局最优手牌拆解 (Multi-branch Hand Partitioning & Dynamic Evaluation)
 * - 残局必胜与连出规划 (Endgame Exact Solver & Walk-off Sequence)
 * - 报单一/报双顶大防范 (Next Player & Threat Matrix Defenses, 杜绝送牌包赔)
 * - 首出 ♦2 最优组牌 (优先组五张/对子/三条快速甩牌)
 * - 避关保命意识 (10~13张大关警戒与快速减负)
 * - 智能跟牌与适度放行 (Smart Pass & 保护整牌)
 */

import { Card, CardHand, HandType, Player } from '../types/game';
import { analyzeHand, canBeat, sortCards } from './chudadiRules';

// ----------------------------------------------------
// 1. 牌型枚举与全局搜索算法
// ----------------------------------------------------

/**
 * 搜索所有能压制目标牌型的手牌组合 (去重且全面)
 */
export function findBeatingHands(cards: Card[], prevHand: CardHand): CardHand[] {
  if (!cards || cards.length === 0 || !prevHand) return [];

  const candidates: CardHand[] = [];
  const sorted = sortCards(cards);
  const reqCount = prevHand.cards.length;

  // 1. 单张 (Single)
  if (reqCount === 1) {
    for (const c of sorted) {
      const h = analyzeHand([c]);
      if (h && canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
    return candidates;
  }

  // 2. 对子 (Pair)
  if (reqCount === 2) {
    const rankGroups: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    for (const rStr of Object.keys(rankGroups)) {
      const group = rankGroups[Number(rStr)];
      if (group.length >= 2) {
        for (let i = 0; i < group.length - 1; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const h = analyzeHand([group[i], group[j]]);
            if (h && canBeat(prevHand, h)) {
              candidates.push(h);
            }
          }
        }
      }
    }
    return candidates;
  }

  // 3. 三条 (Triple)
  if (reqCount === 3) {
    const rankGroups: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    for (const rStr of Object.keys(rankGroups)) {
      const group = rankGroups[Number(rStr)];
      if (group.length >= 3) {
        for (let i = 0; i < group.length - 2; i++) {
          for (let j = i + 1; j < group.length - 1; j++) {
            for (let k = j + 1; k < group.length; k++) {
              const h = analyzeHand([group[i], group[j], group[k]]);
              if (h && canBeat(prevHand, h)) {
                candidates.push(h);
              }
            }
          }
        }
      }
    }
    return candidates;
  }

  // 4. 五张牌型 (Straight, Flush, Full House, Four of a Kind, Straight Flush)
  if (reqCount === 5 && sorted.length >= 5) {
    const allFiveHands = findAllFiveCardCombos(sorted);
    for (const h of allFiveHands) {
      if (canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
    // 按权重与强弱排序
    return candidates.sort((a, b) => {
      if (a.categoryWeight !== b.categoryWeight) return a.categoryWeight - b.categoryWeight;
      if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
      return a.suitValue - b.suitValue;
    });
  }

  return candidates;
}

/**
 * 找出所有可能的五张合法牌型 (顺子、同花、俘虏、四带一、同花顺)
 */
export function findAllFiveCardCombos(cards: Card[]): CardHand[] {
  if (!cards || cards.length < 5) return [];

  const results: CardHand[] = [];
  const seenSignatures = new Set<string>();
  const sorted = sortCards(cards);

  const addHandIfValid = (handCards: Card[]) => {
    const h = analyzeHand(handCards);
    if (h) {
      const sig = h.cards.map(c => c.id).sort().join(',');
      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        results.push(h);
      }
    }
  };

  const rankGroups: Record<number, Card[]> = {};
  const suitGroups: Record<string, Card[]> = {};

  for (const c of sorted) {
    if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
    rankGroups[c.rankValue].push(c);

    if (!suitGroups[c.suit]) suitGroups[c.suit] = [];
    suitGroups[c.suit].push(c);
  }

  // A. 四带一 (Four of a Kind: 4 cards of same rank + 1 kicker)
  for (const rStr of Object.keys(rankGroups)) {
    const quad = rankGroups[Number(rStr)];
    if (quad.length === 4) {
      // 优先配最小的散牌单张
      for (const single of sorted) {
        if (single.rankValue !== Number(rStr)) {
          addHandIfValid([...quad, single]);
        }
      }
    }
  }

  // B. 俘虏 / 葫芦 (Full House: 3+2)
  const tripsRanks = Object.keys(rankGroups).filter(r => rankGroups[Number(r)].length >= 3).map(Number);
  const pairsRanks = Object.keys(rankGroups).filter(r => rankGroups[Number(r)].length >= 2).map(Number);

  for (const t of tripsRanks) {
    const tripCards = rankGroups[t];
    const tripCombos = getCombinations(tripCards, 3);
    for (const tc of tripCombos) {
      for (const p of pairsRanks) {
        if (p !== t) {
          const pairCards = rankGroups[p];
          const pairCombos = getCombinations(pairCards, 2);
          for (const pc of pairCombos) {
            addHandIfValid([...tc, ...pc]);
          }
        }
      }
    }
  }

  // C. 同花顺与同花 (Flush & Straight Flush)
  for (const s of Object.keys(suitGroups)) {
    const sCards = suitGroups[s];
    if (sCards.length >= 5) {
      const combos = getCombinations(sCards, 5);
      for (const c of combos) {
        addHandIfValid(c);
      }
    }
  }

  // D. 顺子 (Straight)
  // 点数序列定义 (按照规则定义的所有可能顺子组合，不允许 10-J-Q-K-A)
  const straightSequences = [
    [2, 3, 4, 5, 14], // A-2-3-4-5 (最大, 权重 100)
    [9, 10, 11, 12, 13], // 9-10-J-Q-K (第二大, 权重 90)
    [8, 9, 10, 11, 12], // 8-9-10-J-Q
    [7, 8, 9, 10, 11], // 7-8-9-10-J
    [6, 7, 8, 9, 10], // 6-7-8-9-10
    [5, 6, 7, 8, 9], // 5-6-7-8-9
    [4, 5, 6, 7, 8], // 4-5-6-7-8
    [3, 4, 5, 6, 7], // 3-4-5-6-7
    [2, 3, 4, 5, 6], // 2-3-4-5-6
  ];

  for (const seq of straightSequences) {
    if (seq.every(r => rankGroups[r] && rankGroups[r].length > 0)) {
      const c0 = rankGroups[seq[0]];
      const c1 = rankGroups[seq[1]];
      const c2 = rankGroups[seq[2]];
      const c3 = rankGroups[seq[3]];
      const c4 = rankGroups[seq[4]];

      for (const card0 of c0) {
        for (const card1 of c1) {
          for (const card2 of c2) {
            for (const card3 of c3) {
              for (const card4 of c4) {
                addHandIfValid([card0, card1, card2, card3, card4]);
              }
            }
          }
        }
      }
    }
  }

  return results;
}

// 辅助：获取数组的 k 元子组合
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  if (arr.length === k) return [arr];

  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = getCombinations(tail, k);

  return [...withHead, ...withoutHead];
}

// ----------------------------------------------------
// 2. 全局手牌拆解与战力评估模型 (Hand Partitioning)
// ----------------------------------------------------

export interface HandStructure {
  hands: CardHand[];
  unpairedSingles: Card[];
  totalTurns: number;       // 需要几手牌出完
  controlScore: number;     // 大牌控场分 (♠A, 其它A, K, 顺子/俘虏/同花顺)
  brokenScore: number;      // 牌型完整度评分
}

/**
 * 智能拆解手牌结构，寻找出牌手数最少、散牌最少、控场最优的组合
 */
export function partitionHand(cards: Card[]): HandStructure {
  if (!cards || cards.length === 0) {
    return {
      hands: [],
      unpairedSingles: [],
      totalTurns: 0,
      controlScore: 0,
      brokenScore: 100,
    };
  }

  const sorted = sortCards(cards);
  let bestHands: CardHand[] = [];
  let bestUnpaired: Card[] = [];
  let bestTurns = 999;
  let bestScore = -99999;

  // 1. 提取所有五张牌型候选
  const allFive = findAllFiveCardCombos(sorted);

  // 尝试不选五张、选1个五张、选2个五张的不同分支
  const candidateBranches: CardHand[][] = [[]];
  for (const f of allFive) {
    candidateBranches.push([f]);
  }

  // 如果手牌多，尝试两个不冲突的五张组合
  if (sorted.length >= 10 && allFive.length >= 2) {
    for (let i = 0; i < Math.min(allFive.length, 8); i++) {
      for (let j = i + 1; j < Math.min(allFive.length, 10); j++) {
        const h1 = allFive[i];
        const h2 = allFive[j];
        const set1 = new Set(h1.cards.map(c => c.id));
        if (!h2.cards.some(c => set1.has(c.id))) {
          candidateBranches.push([h1, h2]);
        }
      }
    }
  }

  for (const branchFive of candidateBranches) {
    const usedIds = new Set<string>();
    branchFive.forEach(h => h.cards.forEach(c => usedIds.add(c.id)));

    const remainingCards = sorted.filter(c => !usedIds.has(c.id));
    const currentHands: CardHand[] = [...branchFive];

    // 针对剩余牌提取三条、对子、单张
    const rankGroups: Record<number, Card[]> = {};
    for (const c of remainingCards) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    const currentSingles: Card[] = [];

    for (const rStr of Object.keys(rankGroups)) {
      const group = rankGroups[Number(rStr)];
      if (group.length === 4) {
        // 4张拆成两个对子
        currentHands.push(analyzeHand([group[0], group[1]])!);
        currentHands.push(analyzeHand([group[2], group[3]])!);
      } else if (group.length === 3) {
        currentHands.push(analyzeHand(group)!);
      } else if (group.length === 2) {
        currentHands.push(analyzeHand(group)!);
      } else {
        const sHand = analyzeHand([group[0]])!;
        currentHands.push(sHand);
        currentSingles.push(group[0]);
      }
    }

    const turns = currentHands.length;

    // 评估该结构评分：
    // 手数惩罚：每多一手 -30 分
    // 散牌惩罚：每张 <= 9 的散牌 -20 分；<= 5 的极弱单张额外 -15 分
    // 大牌奖励：♠A +50分, 其它A +25分, K +12分, 俘虏/同花/顺子 +30分, 同花顺 +60分
    let score = 300 - turns * 30;

    for (const s of currentSingles) {
      if (s.rankValue <= 5) score -= 35;
      else if (s.rankValue <= 9) score -= 20;
      else if (s.rankValue === 14) score += 25; // 单张 A
    }

    for (const h of currentHands) {
      if (h.categoryWeight === 50) score += 60; // 同花顺
      else if (h.categoryWeight === 40) score += 45; // 四带一
      else if (h.categoryWeight === 30) score += 35; // 俘虏
      else if (h.categoryWeight >= 10) score += 25; // 顺子/同花
      if (h.cards.some(c => c.id === 'spade-A')) score += 50; // 牌皇 ♠A
    }

    if (score > bestScore || (score === bestScore && turns < bestTurns)) {
      bestScore = score;
      bestTurns = turns;
      bestHands = currentHands;
      bestUnpaired = currentSingles;
    }
  }

  // 大牌控场分
  let controlScore = 0;
  for (const c of cards) {
    if (c.id === 'spade-A') controlScore += 60;
    else if (c.rankValue === 14) controlScore += 35; // A
    else if (c.rankValue === 13) controlScore += 15; // K
  }

  return {
    hands: bestHands,
    unpairedSingles: bestUnpaired,
    totalTurns: bestTurns,
    controlScore,
    brokenScore: bestScore,
  };
}

// ----------------------------------------------------
// 3. 终局必胜与绝对控场判定引擎 (Endgame & Walk-Off Solver)
// ----------------------------------------------------

/**
 * 检查玩家是否具备一杆清台/必胜全控路线
 */
function checkWinningSequence(cards: Card[], anyOpponentAlert: boolean = false): CardHand[] | null {
  if (!cards || cards.length === 0) return null;

  // 1. 如果整副手牌刚好可以作为一个合法牌型一次性出完 (1步绝杀)
  const wholeHand = analyzeHand(cards);
  if (wholeHand) {
    return [wholeHand];
  }

  // 2. 如果手牌拆解后只有 2 手牌
  const partition = partitionHand(cards);
  if (partition.hands.length === 2) {
    const hasSpadeA = cards.some(c => c.id === 'spade-A');
    
    // 如果拥有 ♠A (全场最大单张牌皇)
    if (hasSpadeA) {
      const spadeAHand = partition.hands.find(h => h.cards.some(c => c.id === 'spade-A'));
      const otherHand = partition.hands.find(h => !h.cards.some(c => c.id === 'spade-A'));

      if (spadeAHand && otherHand) {
        // 如果有对手报单或报双（处于危险警报阶段）:
        // 必须先发 ♠A 确保拿到绝对领牌权，再出另一手清空！
        // 绝不能先发小牌让对手溜走！
        if (anyOpponentAlert) {
          return [spadeAHand, otherHand];
        }
        // 如果安全局势，先出非 ♠A 的一手，再用 ♠A 控回清台
        return [otherHand, spadeAHand];
      }
    }
  }

  return null;
}

// ----------------------------------------------------
// 4. 领牌出牌决策引擎 (Leading Cards Selector)
// ----------------------------------------------------

export function chooseLeadingCards(
  cards: Card[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-2',
  players: Player[] = [],
  selfPlayerId?: string
): Card[] {
  if (!cards || cards.length === 0) return [];

  const sorted = sortCards(cards);

  // 第一局第一轮首出：必须包含方块2 (♦2)
  if (isFirstTrick) {
    const starterCard = sorted.find(c => c.id === starterCardId);
    if (starterCard) {
      // 1. 优先出包含 ♦2 的强力五张 (顺子 A2345, 23456, 同花, 俘虏) 一举甩掉5张牌！
      const fiveCombos = findAllFiveCardCombos(sorted).filter(h =>
        h.cards.some(c => c.id === starterCardId)
      );
      if (fiveCombos.length > 0) {
        // 优先出顺子或同花（categoryWeight 小的顺子先出，消耗多张手牌）
        const sortedCombos = fiveCombos.sort((a, b) => a.categoryWeight - b.categoryWeight);
        return sortedCombos[0].cards;
      }

      // 2. 包含 ♦2 的三条
      const rankCards = sorted.filter(c => c.rankValue === starterCard.rankValue);
      if (rankCards.length >= 3) {
        return rankCards.slice(0, 3);
      }

      // 3. 包含 ♦2 的对子
      if (rankCards.length >= 2) {
        return rankCards.slice(0, 2);
      }

      // 4. 单张 ♦2
      return [starterCard];
    }
  }

  // 分析下家及全场对手剩余手牌状态
  const nextPlayer = getNextPlayer(players, selfPlayerId);
  const nextCardCount = nextPlayer ? (nextPlayer.cards ? nextPlayer.cards.length : 13) : 13;
  const isNextPlayerWarning1 = nextCardCount === 1;
  const isNextPlayerWarning2 = nextCardCount === 2;

  const anyOpponentWarning1 = players.some(
    p => p.id !== selfPlayerId && p.cards && p.cards.length === 1
  );
  const anyOpponentWarning2 = players.some(
    p => p.id !== selfPlayerId && p.cards && p.cards.length === 2
  );

  // 检查是否有一杆清台必胜打法
  const winSeq = checkWinningSequence(cards, isNextPlayerWarning1 || isNextPlayerWarning2 || anyOpponentWarning1);
  if (winSeq && winSeq.length > 0) {
    return winSeq[0].cards;
  }

  const partition = partitionHand(cards);
  const { hands, unpairedSingles } = partition;

  // ----------------- 警报应对策略 (Alert Defense) -----------------
  
  // 1. 【下家剩 1 张牌 (下家报单)】：生死关头，绝不出小单张，防止包赔！
  if (isNextPlayerWarning1) {
    // A. 优先出五张牌型 (顺子/同花/俘虏)，下家只剩1张牌必无法接牌
    const fiveHands = hands.filter(h => h.categoryWeight >= 10);
    if (fiveHands.length > 0) {
      return fiveHands[0].cards;
    }

    // B. 其次出对子 (对子彻底封死下家单张)
    const pairHands = hands.filter(h => h.type === 'PAIR');
    if (pairHands.length > 0) {
      return pairHands[0].cards;
    }

    // C. 出三条
    const tripHands = hands.filter(h => h.type === 'TRIPLE');
    if (tripHands.length > 0) {
      return tripHands[0].cards;
    }

    // D. 若手里全是单张，必须出最大单张 (♠A 或 其它A/K) 顶大，绝不出小单张送分！
    return [sorted[sorted.length - 1]];
  }

  // 2. 【任意对手剩 1 张牌 (报单)】：尽量出多张牌型绕过对手
  if (anyOpponentWarning1) {
    const fiveHands = hands.filter(h => h.categoryWeight >= 10);
    if (fiveHands.length > 0) {
      return fiveHands[0].cards;
    }

    const pairHands = hands.filter(h => h.type === 'PAIR');
    if (pairHands.length > 0) {
      return pairHands[0].cards;
    }

    const tripHands = hands.filter(h => h.type === 'TRIPLE');
    if (tripHands.length > 0) {
      return tripHands[0].cards;
    }

    // 若只能出单张，出最大单张顶住
    return [sorted[sorted.length - 1]];
  }

  // 3. 【下家只剩 2 张牌 (下家报双)】：避免发出小对子！
  if (isNextPlayerWarning2) {
    // A. 优先出五张牌型
    const fiveHands = hands.filter(h => h.categoryWeight >= 10);
    if (fiveHands.length > 0) {
      return fiveHands[0].cards;
    }

    // B. 发小单张让下家无法出对
    if (unpairedSingles.length > 0) {
      return [unpairedSingles[0]];
    }

    // C. 发三条
    const tripHands = hands.filter(h => h.type === 'TRIPLE');
    if (tripHands.length > 0) {
      return tripHands[0].cards;
    }

    // D. 若只能出对子，出最大对子压制
    const pairHands = hands.filter(h => h.type === 'PAIR');
    if (pairHands.length > 0) {
      return pairHands[pairHands.length - 1].cards;
    }
  }

  // ----------------- 常规最优领牌策略 -----------------

  // 1. 如果手牌中有成型的五张牌型 (顺子、同花、俘虏)，领出低权重的五张牌迅速消减5张手牌
  const fiveHands = hands.filter(h => h.categoryWeight >= 10);
  if (fiveHands.length > 0) {
    // 排序五张牌型，优先出顺子(10)、同花(20)、俘虏(30)，保留同花顺(50)压底
    const standardFive = fiveHands.filter(h => h.categoryWeight <= 30);
    if (standardFive.length > 0) {
      return standardFive[0].cards;
    }
  }

  // 2. 优先清理手牌中的弱单张 (点数 <= 9 的散牌，借大牌控回)
  const lowSingles = unpairedSingles.filter(c => c.rankValue <= 9);
  if (lowSingles.length > 0) {
    return [lowSingles[0]];
  }

  // 3. 查找弱对子 (点数 <= 10 的对子)
  const lowPairs = hands.filter(h => h.type === 'PAIR' && h.primaryValue <= 10);
  if (lowPairs.length > 0) {
    return lowPairs[0].cards;
  }

  // 4. 如果有三条 (点数 <= 11)，领牌发三条
  const tripHands = hands.filter(h => h.type === 'TRIPLE');
  if (tripHands.length > 0) {
    return tripHands[0].cards;
  }

  // 5. 按照手牌拆解中的第一手牌出牌
  if (hands.length > 0) {
    // 找出不是王牌 ♠A 的最小一手牌
    const safeHands = hands.filter(h => !h.cards.some(c => c.id === 'spade-A'));
    if (safeHands.length > 0) {
      return safeHands[0].cards;
    }
    return hands[0].cards;
  }

  // 兜底：出最小单张
  return [sorted[0]];
}

// ----------------------------------------------------
// 5. 跟牌与战术压制决策引擎 (Following / Beat Engine)
// ----------------------------------------------------

export function chooseBeatingMove(
  cards: Card[],
  prevHand: CardHand,
  lastPlayerId: string,
  players: Player[],
  selfPlayer: Player
): Card[] {
  const beatingCandidates = findBeatingHands(cards, prevHand);
  if (beatingCandidates.length === 0) {
    return []; // 要不起，过牌 (PASS)
  }

  const sorted = sortCards(cards);
  const selfCardCount = sorted.length;

  // 1. 【一击必杀】如果跟出某一手可以直接出完手牌赢得本局，毫不犹豫立即出牌获胜！
  for (const candidate of beatingCandidates) {
    if (candidate.cards.length === selfCardCount) {
      return candidate.cards;
    }
  }

  // 分析玩家状态与危险等级
  const nextPlayer = getNextPlayer(players, selfPlayer.id);
  const isNextPlayerWarning1 = nextPlayer && nextPlayer.cards && nextPlayer.cards.length === 1;
  const isNextPlayerWarning2 = nextPlayer && nextPlayer.cards && nextPlayer.cards.length === 2;
  const anyOpponentWarning1 = players.some(
    p => p.id !== selfPlayer.id && p.cards && p.cards.length === 1
  );
  const anyOpponentWarning2 = players.some(
    p => p.id !== selfPlayer.id && p.cards && p.cards.length === 2
  );

  // 2. 【警报拦截 / 顶大机制】
  // 当下家报单 (剩1张) 且上家出单张时，我方为上家与下家之间的唯一屏障：
  // 必须使用我方最大单张 (顶大) 压制，绝不给下家过小单张的机会！
  if (prevHand.type === 'SINGLE' && isNextPlayerWarning1) {
    const highestSingle = beatingCandidates[beatingCandidates.length - 1];
    return highestSingle.cards;
  }

  // 如果任意对手剩1张牌，且当前打出的是单张，积极顶大 (J 及以上)
  if (prevHand.type === 'SINGLE' && anyOpponentWarning1) {
    const highestSingle = beatingCandidates[beatingCandidates.length - 1];
    if (highestSingle.primaryValue >= 11) {
      return highestSingle.cards;
    }
  }

  // 3. 【避关保命机制】
  // 如果我方手牌还有 13 张 (4倍全关) 或 10~12 张 (3倍大关)，必须积极出牌跑牌解关！
  const isDangerOfMaxPenalty = selfCardCount >= 10;
  if (isDangerOfMaxPenalty) {
    return getLeastDestructiveHand(cards, beatingCandidates, prevHand);
  }

  // 4. 【保护整牌与控牌评估】
  // 对每一个候选牌型打分，选出综合收益最高的牌
  const partition = partitionHand(cards);
  const { unpairedSingles, hands } = partition;

  let bestCandidate: CardHand | null = null;
  let bestMoveScore = -9999;

  for (const cand of beatingCandidates) {
    let moveScore = 0;

    // A. 完美契合评分 (如果这手牌正好在最优手牌拆解中完整存在，奖励 +60 分)
    const isExactCombo = hands.some(h => {
      if (h.type !== cand.type || h.cards.length !== cand.cards.length) return false;
      const hIds = h.cards.map(c => c.id).sort().join(',');
      const cIds = cand.cards.map(c => c.id).sort().join(',');
      return hIds === cIds;
    });

    if (isExactCombo) {
      moveScore += 60;
    }

    // B. 散牌消耗奖励 (如果是单张，且刚好是散牌，奖励 +40 分)
    if (cand.type === 'SINGLE') {
      const isUnpaired = unpairedSingles.some(c => c.id === cand.cards[0].id);
      if (isUnpaired) {
        moveScore += 40;
      }
    }

    // C. 破坏牌型惩罚
    const brokenPenalty = calculateBrokenPenalty(cand, cards);
    moveScore -= brokenPenalty;

    // D. 牌面点数消耗惩罚 (越小的牌压制越划算，优先用贴近的小牌压，避免大牌浪费)
    const rankGap = cand.primaryValue - prevHand.primaryValue;
    moveScore -= rankGap * 3;

    // E. ♠A (牌皇王牌) 特殊保护
    // 如果用了 ♠A，但手牌还很多 (> 4张)，且没有一杆清台的后续，适当保留
    if (cand.cards.some(c => c.id === 'spade-A')) {
      if (selfCardCount > 5) {
        moveScore -= 35; // 除非必要，前期保留 ♠A 控场
      } else {
        moveScore += 45; // 残局用 ♠A 绝杀
      }
    }

    // F. 五张牌型压制权重 (尽量用同花/顺子等低权重，少在小局浪费同花顺)
    if (cand.categoryWeight === 50) { // 同花顺
      if (prevHand.categoryWeight < 30 && selfCardCount > 6) {
        moveScore -= 50; // 杀鸡焉用牛刀
      }
    }

    if (moveScore > bestMoveScore) {
      bestMoveScore = moveScore;
      bestCandidate = cand;
    }
  }

  // 5. 【主动过牌 (PASS) 权衡】
  // 如果最佳候选的得分过低 (意味着需要拆散核心大牌/王牌，且当前并不是必须接牌的危险局势)，
  // 并且当前对手出的牌点数较大，主动 PASS 让其他人消耗大牌
  if (bestMoveScore < -40 && !anyOpponentWarning1 && selfCardCount <= 8) {
    return []; // 主动放弃，等待更好出牌时机
  }

  return bestCandidate ? bestCandidate.cards : beatingCandidates[0].cards;
}

/**
 * 计算拆牌惩罚
 */
function calculateBrokenPenalty(cand: CardHand, allCards: Card[]): number {
  let penalty = 0;
  const candIds = new Set(cand.cards.map(c => c.id));
  const remaining = allCards.filter(c => !candIds.has(c.id));

  const origPartition = partitionHand(allCards);
  const newPartition = partitionHand(remaining);

  // 如果拆牌导致总手数不减反增
  if (newPartition.totalTurns >= origPartition.totalTurns) {
    penalty += 40;
  }

  // 检查是否破坏了原有的五张大牌型
  const origFiveCount = origPartition.hands.filter(h => h.categoryWeight >= 10).length;
  const newFiveCount = newPartition.hands.filter(h => h.categoryWeight >= 10).length;
  if (newFiveCount < origFiveCount) {
    penalty += 70; // 破坏了五张成型大牌
  }

  return penalty;
}

/**
 * 寻找对整手牌破坏最小的候选牌
 */
function getLeastDestructiveHand(
  allCards: Card[],
  candidates: CardHand[],
  prevHand: CardHand
): Card[] {
  let best = candidates[0];
  let minPenalty = 9999;

  for (const c of candidates) {
    const p = calculateBrokenPenalty(c, allCards);
    if (p < minPenalty) {
      minPenalty = p;
      best = c;
    }
  }

  return best.cards;
}

/**
 * 获取指定玩家的下家
 */
function getNextPlayer(players: Player[], currentId?: string): Player | null {
  if (!players || players.length === 0 || !currentId) return null;
  const idx = players.findIndex(p => p.id === currentId);
  if (idx === -1) return null;
  return players[(idx + 1) % players.length];
}

// ----------------------------------------------------
// 6. AI 智能主决策入口 (Exported Master Decision)
// ----------------------------------------------------

export function aiChoosePlay(
  player: Player,
  cards: Card[],
  lastValidHand: { playerId: string; hand: CardHand } | null,
  players: Player[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-2'
): Card[] {
  if (!cards || cards.length === 0) return [];

  // 1. 自由领牌 (本轮我是首出领牌者，或者上一轮大家都 PASS 轮到我自由出牌)
  if (!lastValidHand || lastValidHand.playerId === player.id) {
    return chooseLeadingCards(cards, isFirstTrick, starterCardId, players, player.id);
  }

  // 2. 跟牌压制 (接上家的牌)
  return chooseBeatingMove(
    cards,
    lastValidHand.hand,
    lastValidHand.playerId,
    players,
    player
  );
}
