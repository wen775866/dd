import React, { useState, useEffect, useRef } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import {
  SUIT_SYMBOLS,
  analyzeHand,
  canBeat,
  getHandDescription,
  sortCards,
  sortCardsByPattern,
} from '../utils/doudizhuRules';
import {
  aiChoosePlay,
  aiShouldCallLandlord,
  aiShouldRobLandlord,
  aiShouldDouble,
  chooseLeadingCards,
  findBeatingHands,
} from '../utils/doudizhuAI';
import { sounds } from '../utils/audio';
import { SvgCard } from './SvgCard';
import {
  Play,
  RotateCcw,
  Lightbulb,
  Bomb,
  Flame,
  Trophy,
  Crown,
  User,
  Bot,
  Sparkles,
  Timer,
  Home,
  Zap,
  Volume2,
  VolumeX,
  MessageSquare,
  BotOff,
  SlidersHorizontal,
  X,
  Award,
  AlertTriangle,
} from 'lucide-react';

interface TabletopGameViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

// Iconic QQ Dou Dizhu quick chat lines
const CHAT_PHRASES = [
  '快点吧，我等的花儿都谢了！',
  '和你合作真是太愉快了！',
  '不要走，决战到天亮！',
  '你的牌打得也太好了！',
  '怎么又断线了！',
  '不好意思，这把我要赢了！',
];

const CHAT_EMOJIS = ['💣', '🌹', '☕', '🐔', '🍺', '👍'];

export const TabletopGameView: React.FC<TabletopGameViewProps> = ({
  gameState,
  onUpdateState,
  onStartNewGame,
  onBackToLobby,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{ [playerId: string]: string }>({});
  const [countdown, setCountdown] = useState<number>(20);
  const [bombEffect, setBombEffect] = useState<boolean>(false);
  const [springBanner, setSpringBanner] = useState<string | null>(null);
  const [specialEffectBanner, setSpecialEffectBanner] = useState<{ text: string; sub?: string } | null>(null);

  // Advanced features state
  const [hintIndex, setHintIndex] = useState<number>(0);
  const [sortByPattern, setSortByPattern] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef<boolean>(false);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanCurrent = gameState.currentPlayerIndex === 0;

  // Window pointerup listener for smooth drag-selection
  useEffect(() => {
    const handleUp = () => {
      isPointerDownRef.current = false;
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  const showBubble = (playerId: string, text: string) => {
    setSpeechBubble(prev => ({ ...prev, [playerId]: text }));
    setTimeout(() => {
      setSpeechBubble(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }, 2800);
  };

  // Turn Countdown Timer
  useEffect(() => {
    if (gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER' || gameState.phase === 'DEALING') {
      return;
    }

    setCountdown(isHumanCurrent ? (isAutoPlay ? 2 : 20) : 4);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (isHumanCurrent) {
            handleTimeoutAction();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.currentPlayerIndex, gameState.phase, isAutoPlay]);

  // Timeout handler for human player
  const handleTimeoutAction = () => {
    if (gameState.phase === 'CALL_LANDLORD') {
      handleHumanCall(false);
    } else if (gameState.phase === 'ROB_LANDLORD') {
      handleHumanRob(false);
    } else if (gameState.phase === 'DOUBLING') {
      handleHumanDouble('NONE');
    } else if (gameState.phase === 'PLAYING') {
      if (gameState.lastValidHand) {
        handleHumanPass();
      } else {
        handleHumanHint();
      }
    }
  };

  // Card select toggle
  const toggleSelectCard = (cardId: string) => {
    sounds.playClick();
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCardPointerDown = (cardId: string) => {
    isPointerDownRef.current = true;
    toggleSelectCard(cardId);
  };

  const handleCardPointerEnter = (cardId: string) => {
    if (isPointerDownRef.current) {
      toggleSelectCard(cardId);
    }
  };

  // --- CALL LANDLORD (叫地主) ---
  const handleHumanCall = (call: boolean) => {
    if (gameState.phase !== 'CALL_LANDLORD' || !isHumanCurrent) return;
    sounds.playActionTone(call ? 'call' : 'pass');
    showBubble('player-0', call ? '叫地主！' : '不叫');

    advanceCallTurn(call);
  };

  const advanceCallTurn = (called: boolean) => {
    let nextMult = gameState.multiplier;
    let landlordIdx = gameState.landlordIndex;
    let hasCalled = called;

    if (called) {
      nextMult *= 2;
      landlordIdx = gameState.currentPlayerIndex;
    }

    const nextIdx = (gameState.currentPlayerIndex + 1) % 3;

    if (nextIdx === gameState.firstCallerIndex) {
      if (landlordIdx === -1 && !hasCalled) {
        sounds.playPass();
        showBubble('player-0', '全都不叫，重新发牌！');
        setTimeout(() => onStartNewGame(), 1500);
        return;
      }
      enterRobPhase(landlordIdx, nextMult);
    } else {
      onUpdateState({
        ...gameState,
        currentPlayerIndex: nextIdx,
        multiplier: nextMult,
        landlordIndex: landlordIdx,
      });
    }
  };

  // --- ROB LANDLORD (抢地主) ---
  const enterRobPhase = (currentLandlord: number, mult: number) => {
    const robberIdx = (currentLandlord + 1) % 3;
    onUpdateState({
      ...gameState,
      phase: 'ROB_LANDLORD',
      landlordIndex: currentLandlord,
      currentPlayerIndex: robberIdx,
      currentRobberIndex: robberIdx,
      multiplier: mult,
    });
  };

  const handleHumanRob = (rob: boolean) => {
    if (gameState.phase !== 'ROB_LANDLORD' || !isHumanCurrent) return;
    sounds.playActionTone(rob ? 'rob' : 'pass');
    showBubble('player-0', rob ? '抢地主！' : '不抢');

    advanceRobTurn(rob);
  };

  const advanceRobTurn = (robbed: boolean) => {
    let nextMult = gameState.multiplier;
    let landlordIdx = gameState.landlordIndex;

    if (robbed) {
      nextMult *= 2;
      landlordIdx = gameState.currentPlayerIndex;
    }

    const nextIdx = (gameState.currentPlayerIndex + 1) % 3;

    if (nextIdx === gameState.landlordIndex || gameState.passCount >= 2) {
      finishBiddingAndEnterDoubling(landlordIdx, nextMult);
    } else {
      onUpdateState({
        ...gameState,
        currentPlayerIndex: nextIdx,
        multiplier: nextMult,
        landlordIndex: landlordIdx,
        passCount: robbed ? 0 : gameState.passCount + 1,
      });
    }
  };

  // Finish bidding, give bottom cards to landlord and enter Doubling phase
  const finishBiddingAndEnterDoubling = (finalLandlord: number, mult: number) => {
    const newPlayers = [...gameState.players];
    const landlord = newPlayers[finalLandlord];
    const updatedCards = sortCards([...landlord.cards, ...gameState.bottomCards]);

    newPlayers[finalLandlord] = {
      ...landlord,
      role: 'LANDLORD',
      cards: updatedCards,
    };

    for (let i = 0; i < 3; i++) {
      if (i !== finalLandlord) {
        newPlayers[i] = { ...newPlayers[i], role: 'FARMER' };
      }
    }

    showBubble(landlord.id, '我是地主，底牌归我！');
    sounds.playActionTone('call');

    onUpdateState({
      ...gameState,
      phase: 'DOUBLING',
      players: newPlayers,
      landlordIndex: finalLandlord,
      currentPlayerIndex: 0,
      multiplier: Math.min(gameState.room.maxMultiplier, mult),
      passCount: 0,
    });
  };

  // --- DOUBLING (加倍阶段) ---
  const handleHumanDouble = (choice: 'SUPER' | 'DOUBLE' | 'NONE') => {
    if (gameState.phase !== 'DOUBLING' || !isHumanCurrent) return;

    sounds.playActionTone(choice !== 'NONE' ? 'double' : 'pass');
    showBubble(
      'player-0',
      choice === 'SUPER' ? '💥 超级加倍！' : choice === 'DOUBLE' ? '✨ 加倍！' : '不加倍'
    );

    let nextMult = gameState.multiplier;
    if (choice === 'SUPER') nextMult *= 4;
    else if (choice === 'DOUBLE') nextMult *= 2;
    nextMult = Math.min(gameState.room.maxMultiplier, nextMult);

    advanceDoublingTurn(nextMult);
  };

  const advanceDoublingTurn = (mult: number) => {
    const nextIdx = (gameState.currentPlayerIndex + 1) % 3;

    if (nextIdx === 0) {
      // Everyone finished doubling, start game playing!
      showBubble(
        gameState.players[gameState.landlordIndex].id,
        '战斗开始！地主先出牌！'
      );
      onUpdateState({
        ...gameState,
        phase: 'PLAYING',
        currentPlayerIndex: gameState.landlordIndex,
        multiplier: mult,
        lastValidHand: null,
        passCount: 0,
      });
    } else {
      onUpdateState({
        ...gameState,
        currentPlayerIndex: nextIdx,
        multiplier: mult,
      });
    }
  };

  // --- PLAYING (出牌阶段) ---
  const handleHumanPlay = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent) return;
    const human = gameState.players[0];
    const cardsToPlay = human.cards.filter(c => selectedCardIds.includes(c.id));

    if (cardsToPlay.length === 0) return;

    const hand = analyzeHand(cardsToPlay);
    if (!hand) {
      sounds.playPass();
      showBubble('player-0', '不符合出牌规则！');
      return;
    }

    if (gameState.lastValidHand && !canBeat(gameState.lastValidHand.hand, hand)) {
      sounds.playPass();
      showBubble('player-0', '压不过上家的牌！');
      return;
    }

    executePlay(0, cardsToPlay, hand);
    setSelectedCardIds([]);
    setHintIndex(0);
  };

  const handleHumanPass = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent || !gameState.lastValidHand) return;
    sounds.playPass();
    executePass(0);
    setSelectedCardIds([]);
    setHintIndex(0);
  };

  // Smart Multi-Step Hint: cycles through all valid plays on consecutive clicks
  const handleHumanHint = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent) return;
    const human = gameState.players[0];

    if (gameState.lastValidHand) {
      const candidates = findBeatingHands(human.cards, gameState.lastValidHand.hand);
      if (candidates.length === 0) {
        showBubble('player-0', '要不起，请点不出~');
      } else {
        const candidate = candidates[hintIndex % candidates.length];
        setSelectedCardIds(candidate.cards.map(c => c.id));
        setHintIndex(prev => prev + 1);
        sounds.playClick();
      }
    } else {
      // Free opening lead: suggest lowest opening hand
      const opening = chooseLeadingCards(human.cards);
      if (opening.length > 0) {
        setSelectedCardIds(opening.map(c => c.id));
        sounds.playClick();
      }
    }
  };

  // Reset selected cards
  const handleResetSelection = () => {
    sounds.playClick();
    setSelectedCardIds([]);
  };

  // Send fast chat phrase
  const handleSendChat = (phrase: string) => {
    setShowChatModal(false);
    showBubble('player-0', phrase);
    sounds.playClick();

    // Random bot response
    setTimeout(() => {
      const botIdx = Math.random() > 0.5 ? 1 : 2;
      const bot = gameState.players[botIdx];
      const botReplies = [
        '哈哈，看我这把怎么打！',
        '别急别急，好戏在后头！',
        '牌打得不错嘛！',
        '稳住，这把我们必胜！',
      ];
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      showBubble(bot.id, reply);
    }, 1200);
  };

  // Execute Play
  const executePlay = (playerIdx: number, cards: Card[], hand: CardHand) => {
    const isBomb = hand.type === 'BOMB';
    const isRocket = hand.type === 'ROCKET';
    const isStraight = hand.type === 'STRAIGHT';
    const isConsecutivePairs = hand.type === 'CONSECUTIVE_PAIRS';
    const isAirplane = hand.type.startsWith('AIRPLANE');

    // Trigger visual celebration effects
    if (isRocket) {
      sounds.playBomb();
      setSpecialEffectBanner({ text: '🚀 王炸冲天！', sub: '全场翻 4 倍！' });
      setTimeout(() => setSpecialEffectBanner(null), 1800);
    } else if (isBomb) {
      sounds.playBomb();
      setBombEffect(true);
      setSpecialEffectBanner({ text: '💣 炸弹连击！', sub: '倍数翻倍！' });
      setTimeout(() => {
        setBombEffect(false);
        setSpecialEffectBanner(null);
      }, 1500);
    } else if (isAirplane) {
      sounds.playCard();
      setSpecialEffectBanner({ text: '✈️ 飞机起飞！', sub: '呼啸全场！' });
      setTimeout(() => setSpecialEffectBanner(null), 1600);
    } else if (isStraight) {
      sounds.playCard();
      setSpecialEffectBanner({ text: '🌈 顺子长龙！' });
      setTimeout(() => setSpecialEffectBanner(null), 1400);
    } else if (isConsecutivePairs) {
      sounds.playCard();
      setSpecialEffectBanner({ text: '⚡ 绝妙连对！' });
      setTimeout(() => setSpecialEffectBanner(null), 1400);
    } else {
      sounds.playCard();
    }

    const player = gameState.players[playerIdx];
    const remainingCards = player.cards.filter(c => !cards.some(tc => tc.id === c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerIdx] = {
      ...player,
      cards: remainingCards,
    };

    let newMult = gameState.multiplier;
    let newBombs = gameState.bombCount;
    if (isBomb) {
      newMult *= 2;
      newBombs += 1;
      showBubble(player.id, '💣 炸弹！');
    } else if (isRocket) {
      newMult *= 4;
      newBombs += 1;
      showBubble(player.id, '🚀 王炸！！');
    } else {
      showBubble(player.id, getHandDescription(hand));
    }

    newMult = Math.min(gameState.room.maxMultiplier, newMult);

    if (remainingCards.length === 2) {
      showBubble(player.id, '⚠️ 只剩两张牌！');
    } else if (remainingCards.length === 1) {
      showBubble(player.id, '🚨 报警！只剩一张牌！');
    }

    // Winner Check
    if (remainingCards.length === 0) {
      handleGameOver(playerIdx, newPlayers, newMult, newBombs);
      return;
    }

    const nextTurn = (playerIdx + 1) % 3;
    onUpdateState({
      ...gameState,
      players: newPlayers,
      currentPlayerIndex: nextTurn,
      lastValidHand: { playerId: player.id, hand },
      passCount: 0,
      multiplier: newMult,
      bombCount: newBombs,
    });
  };

  const executePass = (playerIdx: number) => {
    const player = gameState.players[playerIdx];
    showBubble(player.id, '不要 (过)');

    const newPassCount = gameState.passCount + 1;
    let nextLastValid = gameState.lastValidHand;
    if (newPassCount >= 2) {
      nextLastValid = null;
    }

    const nextTurn = (playerIdx + 1) % 3;
    onUpdateState({
      ...gameState,
      currentPlayerIndex: nextTurn,
      passCount: newPassCount >= 2 ? 0 : newPassCount,
      lastValidHand: nextLastValid,
    });
  };

  // Game Over Settlement with Spring & Coin Accounting
  const handleGameOver = (
    winnerIdx: number,
    finalPlayers: Player[],
    mult: number,
    bombs: number
  ) => {
    const winner = finalPlayers[winnerIdx];
    let finalMult = mult;

    let isSpring = false;
    let isAntiSpring = false;
    if (winner.role === 'LANDLORD') {
      const farmers = finalPlayers.filter(p => p.role === 'FARMER');
      if (farmers.every(f => f.cards.length === 17)) {
        isSpring = true;
        finalMult = Math.min(gameState.room.maxMultiplier, finalMult * 2);
        setSpringBanner('🌸 春天！倍数 x2！');
      }
    } else {
      const landlord = finalPlayers.find(p => p.role === 'LANDLORD');
      if (landlord && landlord.cards.length >= 19) {
        isAntiSpring = true;
        finalMult = Math.min(gameState.room.maxMultiplier, finalMult * 2);
        setSpringBanner('🎋 反春天！倍数 x2！');
      }
    }

    if (isSpring || isAntiSpring) {
      sounds.playActionTone('double');
    }

    const basePoint = gameState.room.baseScore * finalMult;

    // Coins Settlement
    const settledPlayers = finalPlayers.map(p => {
      let delta = 0;
      if (p.id === winner.id) {
        delta = p.role === 'LANDLORD' ? basePoint * 2 : basePoint;
      } else {
        if (winner.role === 'LANDLORD') {
          delta = -basePoint;
        } else {
          delta = p.role === 'LANDLORD' ? -basePoint * 2 : basePoint;
        }
      }
      return {
        ...p,
        score: Math.max(0, p.score + delta),
      };
    });

    if (winner.id === 'player-0') {
      sounds.playWin();
      sounds.playCoins();
    } else {
      sounds.playLose();
    }

    onUpdateState({
      ...gameState,
      players: settledPlayers,
      phase: 'GAME_OVER',
      winnerIndex: winnerIdx,
      multiplier: finalMult,
      bombCount: bombs,
      isSpring,
      isAntiSpring,
    });
  };

  // --- AUTOPLAY (托管) LOGIC FOR HUMAN ---
  useEffect(() => {
    if (!isAutoPlay || !isHumanCurrent || gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER') {
      return;
    }

    const timer = setTimeout(() => {
      const human = gameState.players[0];
      if (gameState.phase === 'CALL_LANDLORD') {
        handleHumanCall(aiShouldCallLandlord(human.cards));
      } else if (gameState.phase === 'ROB_LANDLORD') {
        handleHumanRob(aiShouldRobLandlord(human.cards, human.robCount || 0));
      } else if (gameState.phase === 'DOUBLING') {
        handleHumanDouble(aiShouldDouble(human.cards, human.role === 'LANDLORD'));
      } else if (gameState.phase === 'PLAYING') {
        const play = aiChoosePlay(human, human.cards, gameState.lastValidHand, gameState.players);
        if (play.length === 0) {
          executePass(0);
        } else {
          const hand = analyzeHand(play);
          if (hand) {
            executePlay(0, play, hand);
          } else {
            executePass(0);
          }
        }
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [isAutoPlay, isHumanCurrent, gameState.phase, gameState.currentPlayerIndex]);

  // --- AI ACTIONS (AI 自动决策循环) ---
  useEffect(() => {
    if (isHumanCurrent || gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER') {
      return;
    }

    const curr = gameState.players[gameState.currentPlayerIndex];
    if (!curr || !curr.isAI) return;

    const aiDelay = 1100;

    if (gameState.phase === 'CALL_LANDLORD') {
      const timer = setTimeout(() => {
        const wantsToCall = aiShouldCallLandlord(curr.cards);
        sounds.playActionTone(wantsToCall ? 'call' : 'pass');
        showBubble(curr.id, wantsToCall ? '叫地主！' : '不叫');
        advanceCallTurn(wantsToCall);
      }, aiDelay);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'ROB_LANDLORD') {
      const timer = setTimeout(() => {
        const wantsToRob = aiShouldRobLandlord(curr.cards, curr.robCount || 0);
        sounds.playActionTone(wantsToRob ? 'rob' : 'pass');
        showBubble(curr.id, wantsToRob ? '抢地主！' : '不抢');
        advanceRobTurn(wantsToRob);
      }, aiDelay);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'DOUBLING') {
      const timer = setTimeout(() => {
        const choice = aiShouldDouble(curr.cards, curr.role === 'LANDLORD');
        sounds.playActionTone(choice !== 'NONE' ? 'double' : 'pass');
        showBubble(
          curr.id,
          choice === 'SUPER' ? '💥 超级加倍！' : choice === 'DOUBLE' ? '✨ 加倍！' : '不加倍'
        );
        let nextMult = gameState.multiplier;
        if (choice === 'SUPER') nextMult *= 4;
        else if (choice === 'DOUBLE') nextMult *= 2;
        nextMult = Math.min(gameState.room.maxMultiplier, nextMult);
        advanceDoublingTurn(nextMult);
      }, aiDelay);
      return () => clearTimeout(timer);
    }

    if (gameState.phase === 'PLAYING') {
      const timer = setTimeout(() => {
        const cardsToPlay = aiChoosePlay(
          curr,
          curr.cards,
          gameState.lastValidHand,
          gameState.players
        );

        if (cardsToPlay.length === 0) {
          sounds.playPass();
          executePass(gameState.currentPlayerIndex);
        } else {
          const hand = analyzeHand(cardsToPlay);
          if (hand) {
            executePlay(gameState.currentPlayerIndex, cardsToPlay, hand);
          } else {
            executePass(gameState.currentPlayerIndex);
          }
        }
      }, aiDelay);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayerIndex, gameState.phase, gameState.lastValidHand]);

  const human = gameState.players[0] || { cards: [], name: '玩家', score: 0, role: 'UNKNOWN', id: 'player-0' };
  const botLeft = gameState.players[1] || { cards: [], name: '电脑(左)', score: 0, role: 'UNKNOWN', id: 'player-1' };
  const botRight = gameState.players[2] || { cards: [], name: '电脑(右)', score: 0, role: 'UNKNOWN', id: 'player-2' };

  // Sorted human cards
  const displayedHumanCards = sortByPattern
    ? sortCardsByPattern(human.cards)
    : sortCards(human.cards);

  return (
    <div className="w-full h-full flex flex-col justify-between p-1 sm:p-2 select-none">
      {/* Tabletop Container */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl border-2 sm:border-6 border-amber-950/90 bg-gradient-to-b from-[#093d24] via-[#0c4c2d] to-[#08351f] p-2 sm:p-3 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Felt Lighting Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.18)_0%,rgba(5,46,22,0.85)_75%)] pointer-events-none" />

        {/* Bomb Explosion Flash */}
        {bombEffect && (
          <div className="absolute inset-0 bg-red-600/35 z-40 animate-ping pointer-events-none flex items-center justify-center">
            <span className="text-5xl sm:text-7xl font-black text-amber-300 drop-shadow-2xl animate-bounce">
              💥 炸弹！
            </span>
          </div>
        )}

        {/* Spring Banner Overlay */}
        {springBanner && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-black text-2xl sm:text-4xl px-8 py-3 rounded-full shadow-2xl border-4 border-yellow-300 animate-in zoom-in-50 duration-300">
            {springBanner}
          </div>
        )}

        {/* Special Celebration Banner (Rocket, Plane, Straight) */}
        {specialEffectBanner && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-slate-950 font-black text-xl sm:text-3xl px-8 py-3 rounded-full shadow-2xl border-4 border-white animate-in zoom-in-75 duration-200 flex flex-col items-center">
            <span>{specialEffectBanner.text}</span>
            {specialEffectBanner.sub && (
              <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{specialEffectBanner.sub}</span>
            )}
          </div>
        )}

        {/* TOP BAR: Room info, Bottom Cards tray, Controls */}
        <div className="relative z-10 flex items-center justify-between gap-2 bg-black/55 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-2xl border border-emerald-500/30">
          {/* Left: Back to Lobby & Room info */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                onBackToLobby();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>大厅</span>
            </button>

            <span className="text-xs font-black text-amber-300 hidden sm:inline">
              {gameState.room.name}
            </span>

            <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1 font-mono">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>x{gameState.multiplier}</span>
            </span>

            {gameState.bombCount > 0 && (
              <span className="text-[11px] font-bold text-red-400 px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/50">
                炸弹 {gameState.bombCount}
              </span>
            )}
          </div>

          {/* Center: 3 Bottom Cards (底牌) */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-950/90 px-3 sm:px-4 py-1 rounded-xl border border-emerald-500/40 shadow-inner">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-200">底牌:</span>
            <div className="flex items-center gap-1">
              {gameState.bottomCards.map((card, i) => {
                const isRevealed =
                  gameState.phase === 'DOUBLING' ||
                  gameState.phase === 'PLAYING' ||
                  gameState.phase === 'GAME_OVER';
                return (
                  <SvgCard
                    key={card.id || i}
                    card={card}
                    showBack={!isRevealed}
                    size="sm"
                    className="shadow-md"
                  />
                );
              })}
            </div>
          </div>

          {/* Right: Sound, Fast Chat, Autoplay toggle */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Chat Button */}
            <button
              onClick={() => setShowChatModal(true)}
              className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/80 text-amber-300 hover:text-white text-xs cursor-pointer transition-colors shadow"
              title="快捷短语与互动表情"
            >
              <MessageSquare className="w-4 h-4" />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-lg border text-xs cursor-pointer shadow transition-all ${
                soundEnabled
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? '静音' : '开音效'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Autoplay / Trust mode toggle */}
            <button
              onClick={() => {
                sounds.playClick();
                setIsAutoPlay(prev => !prev);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                isAutoPlay
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 animate-pulse'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
              title={isAutoPlay ? '取消托管' : '开启托管'}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAutoPlay ? '托管中' : '托管'}</span>
            </button>
          </div>
        </div>

        {/* ARENA: Left AI, Middle Battle Zone, Right AI */}
        <div className="relative z-10 grid grid-cols-12 gap-2 items-center my-auto py-2">
          {/* Left Bot (AI 1) */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botLeft.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce">
                  {speechBubble[botLeft.id]}
                </div>
              )}
              <div
                className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all ${
                  gameState.currentPlayerIndex === 1
                    ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105 bg-emerald-900'
                    : 'border-emerald-700/80 bg-slate-950/70'
                } ${botLeft.role === 'LANDLORD' ? 'border-red-500 bg-red-950/50' : ''}`}
              >
                {botLeft.role === 'LANDLORD' ? (
                  <Crown className="w-8 h-8 text-amber-400 drop-shadow" />
                ) : (
                  <Bot className="w-8 h-8 text-emerald-400 drop-shadow" />
                )}
              </div>
              {botLeft.role !== 'UNKNOWN' && (
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black px-2 py-0.2 rounded-full shadow ${
                    botLeft.role === 'LANDLORD'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {botLeft.role === 'LANDLORD' ? '地主' : '农民'}
                </span>
              )}
            </div>

            <div className="text-center mt-2">
              <div className="text-xs font-bold text-slate-100">{botLeft.name}</div>
              <div className="text-[11px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={
                    botLeft.cards.length <= 2 ? 'text-red-400 animate-pulse font-black' : 'text-emerald-300'
                  }
                >
                  {botLeft.cards.length <= 2 && '🚨 '}剩 {botLeft.cards.length} 张
                </span>
              </div>
            </div>

            {/* Overlapping Card Backs */}
            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(6, botLeft.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>

          {/* Center Table Battle Zone */}
          <div className="col-span-6 flex flex-col items-center justify-center min-h-[150px] px-1">
            {gameState.lastValidHand ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-[11px] sm:text-xs font-bold text-amber-300 bg-black/60 px-3 py-1 rounded-full border border-amber-500/30 shadow-lg">
                  {gameState.players.find(p => p.id === gameState.lastValidHand?.playerId)?.name}{' '}
                  打出 · {getHandDescription(gameState.lastValidHand.hand)}
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
                  {gameState.lastValidHand.hand.cards.map((c, i) => (
                    <SvgCard
                      key={c.id || i}
                      card={c}
                      size="md"
                      className="animate-in fade-in zoom-in-95 duration-200 shadow-xl"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-emerald-300/70 text-xs sm:text-sm border-2 border-dashed border-emerald-500/30 px-6 py-4 rounded-2xl bg-black/25">
                {gameState.phase === 'CALL_LANDLORD' && '叫地主阶段...'}
                {gameState.phase === 'ROB_LANDLORD' && '抢地主阶段...'}
                {gameState.phase === 'DOUBLING' && '加倍思考中...'}
                {gameState.phase === 'PLAYING' && '桌面当前无牌，请任意出牌'}
              </div>
            )}
          </div>

          {/* Right Bot (AI 2) */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botRight.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1.5 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce">
                  {speechBubble[botRight.id]}
                </div>
              )}
              <div
                className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all ${
                  gameState.currentPlayerIndex === 2
                    ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105 bg-emerald-900'
                    : 'border-emerald-700/80 bg-slate-950/70'
                } ${botRight.role === 'LANDLORD' ? 'border-red-500 bg-red-950/50' : ''}`}
              >
                {botRight.role === 'LANDLORD' ? (
                  <Crown className="w-8 h-8 text-amber-400 drop-shadow" />
                ) : (
                  <Bot className="w-8 h-8 text-emerald-400 drop-shadow" />
                )}
              </div>
              {botRight.role !== 'UNKNOWN' && (
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-black px-2 py-0.2 rounded-full shadow ${
                    botRight.role === 'LANDLORD'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {botRight.role === 'LANDLORD' ? '地主' : '农民'}
                </span>
              )}
            </div>

            <div className="text-center mt-2">
              <div className="text-xs font-bold text-slate-100">{botRight.name}</div>
              <div className="text-[11px] font-mono font-bold flex items-center justify-center gap-1 mt-0.5">
                <span
                  className={
                    botRight.cards.length <= 2 ? 'text-red-400 animate-pulse font-black' : 'text-emerald-300'
                  }
                >
                  {botRight.cards.length <= 2 && '🚨 '}剩 {botRight.cards.length} 张
                </span>
              </div>
            </div>

            {/* Overlapping Card Backs */}
            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(6, botRight.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Human Actions & Overlapping Card Fan */}
        <div className="relative z-20 flex flex-col items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-emerald-500/25">
          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {/* Autoplay Active Banner */}
            {isAutoPlay && isHumanCurrent && (
              <div className="flex items-center gap-2 bg-amber-500/90 text-slate-950 px-4 py-1.5 rounded-full font-black text-xs shadow-lg animate-pulse">
                <Bot className="w-4 h-4" />
                <span>智能托管中，AI将为您自动出牌</span>
                <button
                  onClick={() => setIsAutoPlay(false)}
                  className="ml-1 px-2 py-0.5 bg-slate-950 text-white text-[10px] rounded-full hover:bg-slate-800"
                >
                  解除托管
                </button>
              </div>
            )}

            {/* Phase 1: Call Landlord Buttons */}
            {gameState.phase === 'CALL_LANDLORD' && isHumanCurrent && !isAutoPlay && (
              <div className="flex items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-amber-500/50 shadow-xl">
                <div className="flex items-center gap-1 text-xs font-black text-amber-300 px-2">
                  <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>{countdown}s</span>
                </div>
                <button
                  onClick={() => handleHumanCall(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  不叫
                </button>
                <button
                  onClick={() => handleHumanCall(true)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/40 cursor-pointer"
                >
                  叫地主 (x2)
                </button>
              </div>
            )}

            {/* Phase 2: Rob Landlord Buttons */}
            {gameState.phase === 'ROB_LANDLORD' && isHumanCurrent && !isAutoPlay && (
              <div className="flex items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-red-500/50 shadow-xl">
                <div className="flex items-center gap-1 text-xs font-black text-amber-300 px-2">
                  <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>{countdown}s</span>
                </div>
                <button
                  onClick={() => handleHumanRob(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  不抢
                </button>
                <button
                  onClick={() => handleHumanRob(true)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-500/40 cursor-pointer"
                >
                  抢地主 (x2)
                </button>
              </div>
            )}

            {/* Phase 3: Doubling Buttons */}
            {gameState.phase === 'DOUBLING' && isHumanCurrent && !isAutoPlay && (
              <div className="flex items-center gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-purple-500/50 shadow-xl">
                <div className="flex items-center gap-1 text-xs font-black text-amber-300 px-2">
                  <Timer className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span>{countdown}s</span>
                </div>
                <button
                  onClick={() => handleHumanDouble('NONE')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  不加倍
                </button>
                <button
                  onClick={() => handleHumanDouble('DOUBLE')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-black text-xs sm:text-sm shadow-md cursor-pointer"
                >
                  加倍 (x2)
                </button>
                {human.role === 'LANDLORD' && (
                  <button
                    onClick={() => handleHumanDouble('SUPER')}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/40 cursor-pointer"
                  >
                    超级加倍 (x4)
                  </button>
                )}
              </div>
            )}

            {/* Phase 4: Playing Buttons */}
            {gameState.phase === 'PLAYING' && isHumanCurrent && !isAutoPlay && (
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="flex items-center gap-1 text-xs font-black text-amber-300 bg-black/60 px-2.5 py-1.5 rounded-xl border border-amber-500/30">
                  <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>{countdown}s</span>
                </div>

                {/* Smart Multi-Candidate Hint */}
                <button
                  onClick={handleHumanHint}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  title="多方案智能提示"
                >
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  <span>提示</span>
                </button>

                {/* Pass Button */}
                <button
                  onClick={handleHumanPass}
                  disabled={!gameState.lastValidHand}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    gameState.lastValidHand
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer active:scale-95'
                      : 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                  }`}
                >
                  不出 (过)
                </button>

                {/* Reset Selection Button */}
                {selectedCardIds.length > 0 && (
                  <button
                    onClick={handleResetSelection}
                    className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-200 text-xs sm:text-sm font-bold cursor-pointer transition-all active:scale-95"
                  >
                    重选
                  </button>
                )}

                {/* Play Button */}
                <button
                  onClick={handleHumanPlay}
                  disabled={selectedCardIds.length === 0}
                  className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-xl transition-all cursor-pointer ${
                    selectedCardIds.length > 0
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-110 text-white shadow-emerald-950/60 scale-105 active:scale-100'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>出牌 ({selectedCardIds.length})</span>
                </button>
              </div>
            )}

            {!isHumanCurrent && gameState.phase !== 'GAME_OVER' && (
              <div className="text-xs sm:text-sm text-emerald-300/80 font-bold py-1.5 animate-pulse flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>{currentPlayer?.name} 正在思考中...</span>
              </div>
            )}
          </div>

          {/* Overlapping Card Fan for Human Player */}
          <div className="w-full flex items-center justify-center overflow-x-auto py-2 px-1">
            <div className="flex -space-x-7 sm:-space-x-9 md:-space-x-11 lg:-space-x-12 shrink-0">
              {displayedHumanCards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    onPointerDown={() => handleCardPointerDown(card.id)}
                    onPointerEnter={() => handleCardPointerEnter(card.id)}
                  >
                    <SvgCard
                      card={card}
                      isSelected={isSelected}
                      size="lg"
                      className="shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player Info Row & Sorting Toggle */}
          <div className="flex items-center justify-between w-full px-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100">{human.name}</span>
              {human.role !== 'UNKNOWN' && (
                <span
                  className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                    human.role === 'LANDLORD'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {human.role === 'LANDLORD' ? '地主' : '农民'}
                </span>
              )}
            </div>

            {/* Hand Sorting Mode & Card Counts */}
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <button
                onClick={() => {
                  sounds.playClick();
                  setSortByPattern(prev => !prev);
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer text-[11px] font-bold"
                title="切换理牌方式"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>理牌: {sortByPattern ? '按牌型' : '按大小'}</span>
              </button>

              <span>
                手牌: <strong className="text-slate-100 font-mono">{human.cards.length}</strong> 张
              </span>
              <span>
                欢乐豆: <strong className="text-amber-400 font-mono">{human.score.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Chat Modal */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3">
            <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-sm w-full p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>快捷短语 & 互动表情</span>
                </h4>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Emojis Row */}
              <div className="flex items-center justify-around bg-slate-950 p-2 rounded-2xl border border-slate-800">
                {CHAT_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(emoji)}
                    className="text-2xl hover:scale-125 transition-transform active:scale-95 cursor-pointer p-1"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Classic Phrases List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {CHAT_PHRASES.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(phrase)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between group"
                  >
                    <span>{phrase}</span>
                    <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      发送 ➔
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Victory / Defeat Modal with Full Open-Card Recap */}
        {gameState.phase === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {gameState.players[gameState.winnerIndex!]?.role === 'LANDLORD'
                    ? `🏆 地主 [${gameState.players[gameState.winnerIndex!]?.name}] 胜出！`
                    : '🎉 农民同盟获得胜利！'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  最终结算倍数: <span className="text-amber-400 font-bold font-mono">x{gameState.multiplier}</span>
                  {gameState.isSpring && ' (春天 x2)'}
                  {gameState.isAntiSpring && ' (反春天 x2)'}
                  {gameState.bombCount > 0 && ` (炸弹 x${Math.pow(2, gameState.bombCount)})`}
                </p>
              </div>

              {/* Three Players Recap with Open Remaining Cards */}
              <div className="w-full bg-slate-950/80 rounded-2xl p-3 border border-slate-800 text-xs space-y-2 text-left">
                {gameState.players.map(p => {
                  const isWinner = p.id === gameState.players[gameState.winnerIndex!]?.id;
                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-bold flex items-center gap-1.5">
                          <span>{p.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                              p.role === 'LANDLORD'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {p.role === 'LANDLORD' ? '地主' : '农民'}
                          </span>
                          {isWinner && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              胜者
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm">
                          {p.score.toLocaleString()} 豆
                        </span>
                      </div>

                      {/* Remaining Cards Open Display */}
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {p.cards.length === 0 ? '手牌出尽' : `剩余手牌(${p.cards.length}):`}
                        </span>
                        {p.cards.length > 0 ? (
                          p.cards.map((card, ci) => (
                            <span
                              key={card.id || ci}
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-black border ${
                                card.color === 'red'
                                  ? 'bg-red-950/40 text-red-400 border-red-500/30'
                                  : 'bg-slate-800 text-slate-200 border-slate-700'
                              }`}
                            >
                              {SUIT_SYMBOLS[card.suit]}
                              {card.displayRank}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold">✨ 全部出清！</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={onBackToLobby}
                  className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm cursor-pointer transition-all"
                >
                  返回大厅
                </button>
                <button
                  onClick={onStartNewGame}
                  className="py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/40 cursor-pointer transition-all active:scale-95"
                >
                  继续下一局
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
