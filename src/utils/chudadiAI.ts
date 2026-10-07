/**
 * 锄大地 AI 决策与托管引擎
 * 针对定制规则进行深度优化：
 * - A最大，2最小 (2 < 3 < ... < K < A)
 * - 黑桃 > 红桃 > 梅花 > 方块
 * - 无纯四张铁支，有四带一、俘虏(三带二)、同花、顺子、同花顺
 * - 同花顺与同花绝对花色优先压制，同花顺A2345最大，9 10 J Q K第二大
 * - 智能防拆大牌、智能顶大、智能拦截警报（剩1~2张牌玩家）
 */

import { Card, CardHand, Player } from '../types/game';
import { analyzeHand, canBeat, sortCards } from './chudadiRules';

// 搜索所有能压制目标牌型的手牌组合
export function findBeatingHands(cards: Card[], prevHand: CardHand): CardHand[] {
  if (!cards || cards.length === 0 || !prevHand) return [];

  const candidates: CardHand[] = [];
  const sorted = sortCards(cards);
  const reqCount = prevHand.cards.length;

  // 1. 单张
  if (reqCount === 1) {
    for (const c of sorted) {
      const h = analyzeHand([c]);
      if (h && canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
    return candidates;
  }

  // 2. 对子
  if (reqCount === 2) {
    const rankGroups: Record<number, Card[]> = {};
    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);
    }

    for (const rStr of Object.keys(rankGroups)) {
      const group = rankGroups[Number(rStr)];
      if (group.length >= 2) {
        // 枚举可能对子
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

  // 3. 三条
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

  // 4. 五张牌型 (同花顺、四带一、俘虏、同花、顺子)
  if (reqCount === 5 && sorted.length >= 5) {
    // 针对性高效枚举，避免盲目组合搜索爆炸
    const rankGroups: Record<number, Card[]> = {};
    const suitGroups: Record<string, Card[]> = {};

    for (const c of sorted) {
      if (!rankGroups[c.rankValue]) rankGroups[c.rankValue] = [];
      rankGroups[c.rankValue].push(c);

      if (!suitGroups[c.suit]) suitGroups[c.suit] = [];
      suitGroups[c.suit].push(c);
    }

    // A. 枚举 四带一 (4张相同 + 1张任意单牌)
    for (const rStr of Object.keys(rankGroups)) {
      const quad = rankGroups[Number(rStr)];
      if (quad.length === 4) {
        for (const single of sorted) {
          if (single.rankValue !== Number(rStr)) {
            const h = analyzeHand([...quad, single]);
            if (h && canBeat(prevHand, h)) {
              candidates.push(h);
            }
          }
        }
      }
    }

    // B. 枚举 俘虏 / 葫芦 (3张相同 + 2张相同)
    const trips = Object.keys(rankGroups).filter(r => rankGroups[Number(r)].length >= 3);
    const pairs = Object.keys(rankGroups).filter(r => rankGroups[Number(r)].length >= 2);

    for (const t of trips) {
      const tripCards = rankGroups[Number(t)].slice(0, 3);
      for (const p of pairs) {
        if (p !== t) {
          const pairCards = rankGroups[Number(p)].slice(0, 2);
          const h = analyzeHand([...tripCards, ...pairCards]);
          if (h && canBeat(prevHand, h)) {
            candidates.push(h);
          }
        }
      }
    }

    // C. 枚举 同花 & 同花顺 (同花色选5张)
    for (const s of Object.keys(suitGroups)) {
      const sCards = suitGroups[s];
      if (sCards.length >= 5) {
        // 滑动窗口或枚举
        for (let i = 0; i <= sCards.length - 5; i++) {
          const h = analyzeHand(sCards.slice(i, i + 5));
          if (h && canBeat(prevHand, h)) {
            candidates.push(h);
          }
        }
      }
    }

    // D. 枚举 顺子 (点数连续的5张)
    const uniqueRanks = Array.from(new Set(sorted.map(c => c.rankValue))).sort((a, b) => a - b);
    // 检查连续 5 个点数
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
      if (
        uniqueRanks[i + 1] === uniqueRanks[i] + 1 &&
        uniqueRanks[i + 2] === uniqueRanks[i] + 2 &&
        uniqueRanks[i + 3] === uniqueRanks[i] + 3 &&
        uniqueRanks[i + 4] === uniqueRanks[i] + 4
      ) {
        const straightCards = [
          sorted.find(c => c.rankValue === uniqueRanks[i])!,
          sorted.find(c => c.rankValue === uniqueRanks[i + 1])!,
          sorted.find(c => c.rankValue === uniqueRanks[i + 2])!,
          sorted.find(c => c.rankValue === uniqueRanks[i + 3])!,
          sorted.find(c => c.rankValue === uniqueRanks[i + 4])!,
        ];
        const h = analyzeHand(straightCards);
        if (h && canBeat(prevHand, h)) {
          candidates.push(h);
        }
      }
    }

    // 特殊顺子：A-2-3-4-5 (ranks: 14, 2, 3, 4, 5)
    if ([2, 3, 4, 5, 14].every(r => uniqueRanks.includes(r))) {
      const a2345Cards = [
        sorted.find(c => c.rankValue === 2)!,
        sorted.find(c => c.rankValue === 3)!,
        sorted.find(c => c.rankValue === 4)!,
        sorted.find(c => c.rankValue === 5)!,
        sorted.find(c => c.rankValue === 14)!,
      ];
      const h = analyzeHand(a2345Cards);
      if (h && canBeat(prevHand, h)) {
        candidates.push(h);
      }
    }
  }

  // 排序候选手牌：先按牌型权重排序（顺子 < 同花 < 俘虏 < 四带一 < 同花顺），再按数值从小到大
  return candidates.sort((a, b) => {
    if (a.categoryWeight !== b.categoryWeight) return a.categoryWeight - b.categoryWeight;
    if (a.primaryValue !== b.primaryValue) return a.primaryValue - b.primaryValue;
    return a.suitValue - b.suitValue;
  });
}

// 领牌时选择最优起手牌型
export function chooseLeadingCards(
  cards: Card[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-2'
): Card[] {
  if (!cards || cards.length === 0) return [];

  const sorted = sortCards(cards);

  // 第一局第一轮首出：必须包含方块2 (♦2)
  if (isFirstTrick) {
    const starterCard = sorted.find(c => c.id === starterCardId);
    if (starterCard) {
      // 1. 尝试包含 ♦2 的顺子/同花顺 (如 A2345, 23456)
      const fiveCombos = findAnyFiveCardCombosContaining(sorted, starterCardId);
      if (fiveCombos.length > 0) {
        return fiveCombos[0].cards;
      }

      // 2. 尝试包含 ♦2 的三条
      const triples = sorted.filter(c => c.rankValue === starterCard.rankValue);
      if (triples.length >= 3) {
        return triples.slice(0, 3);
      }

      // 3. 尝试包含 ♦2 的对子
      if (triples.length >= 2) {
        return triples.slice(0, 2);
      }

      // 4. 单张 ♦2
      return [starterCard];
    }
  }

  // 常规领牌策略（从小到大出，优先消五张与小对子，保留大牌控场）：
  // 1. 查找较小的顺子或俘虏（消耗多张手牌）
  const fiveCombos = findAllFiveCardCombos(sorted);
  if (fiveCombos.length > 0) {
    // 优先出小顺子或俘虏
    const lowCombos = fiveCombos.filter(c => c.categoryWeight <= 30);
    if (lowCombos.length > 0) {
      return lowCombos[0].cards;
    }
  }

  // 2. 查找较小点数的对子 (点数 <= 10)
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].rankValue === sorted[i + 1].rankValue && sorted[i].rankValue <= 10) {
      return [sorted[i], sorted[i + 1]];
    }
  }

  // 3. 查找最小单张 (点数最小的一张牌)
  return [sorted[0]];
}

// 辅助：找出所有合法的五张牌型
function findAllFiveCardCombos(cards: Card[]): CardHand[] {
  if (cards.length < 5) return [];
  const dummyPrev: CardHand = {
    type: 'STRAIGHT',
    cards: [],
    categoryWeight: 0,
    primaryValue: 0,
    suitValue: 0,
  };
  return findBeatingHands(cards, dummyPrev);
}

// 辅助：找出包含指定必备牌的五张牌型
function findAnyFiveCardCombosContaining(cards: Card[], requiredCardId: string): CardHand[] {
  const allCombos = findAllFiveCardCombos(cards);
  return allCombos.filter(h => h.cards.some(c => c.id === requiredCardId));
}

// AI 智能主决策引擎
export function aiChoosePlay(
  player: Player,
  cards: Card[],
  lastValidHand: { playerId: string; hand: CardHand } | null,
  players: Player[],
  isFirstTrick: boolean = false,
  starterCardId: string = 'diamond-2'
): Card[] {
  // 1. 自由领牌
  if (!lastValidHand || lastValidHand.playerId === player.id) {
    return chooseLeadingCards(cards, isFirstTrick, starterCardId);
  }

  // 2. 跟牌压制
  const beatingCandidates = findBeatingHands(cards, lastValidHand.hand);
  if (beatingCandidates.length === 0) {
    return []; // 要不起，过牌
  }

  // 识别当前桌面上是否有玩家剩余张数 <= 2（处于紧急报警状态）
  const dangerousOpponents = players.filter(
    p => p.id !== player.id && p.cards && p.cards.length <= 2
  );
  const isAlarmState = dangerousOpponents.length > 0;

  // 如果处于报警状态：不保留大牌，立即用最大能压的牌进行阻截拦截！
  if (isAlarmState) {
    // 倒序选择最高牌压死，防止下家出清走人
    const highestHand = beatingCandidates[beatingCandidates.length - 1];
    return highestHand.cards;
  }

  // 智能护牌/控牌策略（非报警状态）：
  // 如果对手打的是单张，而我方最小压制牌是 A (最大牌 14) 或 K (13)，
  // 且我方手牌还有较多张（> 3张），非必要时不必过早用 A/K 浪费控手权
  const chosen = beatingCandidates[0];
  if (lastValidHand.hand.type === 'SINGLE') {
    if (chosen.cards[0].rankValue === 14 && cards.length > 4 && Math.random() < 0.45) {
      return []; // 主动隐忍，保留 A 在残局控场
    }
  }

  return chosen.cards;
}
