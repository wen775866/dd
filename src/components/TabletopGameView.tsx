import React, { useState, useEffect, useRef } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import {
  SUIT_SYMBOLS,
  analyzeHand,
  canBeat,
  getHandDescription,
  sortCards,
  sortCardsByRank,
} from '../utils/chudadiRules';
import {
  aiChoosePlay,
  chooseLeadingCards,
  findBeatingHands,
} from '../utils/chudadiAI';
import { sounds } from '../utils/audio';
import { SvgCard } from './SvgCard';
import {
  Play,
  Lightbulb,
  Trophy,
  Crown,
  User,
  Bot,
  Sparkles,
  Home,
  Flame,
  Volume2,
  VolumeX,
  MessageSquare,
  SlidersHorizontal,
  X,
  Shuffle,
  Mic,
  Send,
  Radio,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { voiceEngine, DIALECT_OPTIONS, VoiceDialect, ChatMessage } from '../utils/voiceSystem';

interface TabletopGameViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
  onChangeTable?: () => void;
  onBackToLobby: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const CHAT_PHRASES = [
  '快点吧，我等的花儿都谢了！',
  '和你合作真是太愉快了！',
  '不要走，决战到天亮！',
  '你的牌打得也太好了！',
  '怎么又断线了！',
  '不好意思，这把我要跑清了！',
  '关门大吉，承让承让！',
  '一手臭牌，真是倒霉！',
];

const CHAT_EMOJIS = ['💣', '🌹', '☕', '🐔', '🍺', '👍'];

export const TabletopGameView: React.FC<TabletopGameViewProps> = ({
  gameState,
  onUpdateState,
  onStartNewGame,
  onChangeTable,
  onBackToLobby,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{ [playerId: string]: string }>({});
  const [countdown, setCountdown] = useState<number>(20);
  const [specialEffectBanner, setSpecialEffectBanner] = useState<{ text: string; sub?: string } | null>(null);

  // Advanced interactive features
  const [hintIndex, setHintIndex] = useState<number>(0);
  const [sortByPattern, setSortByPattern] = useState<boolean>(false);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [showChatModal, setShowChatModal] = useState<boolean>(false);
  const [customChatText, setCustomChatText] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSec, setRecordingSec] = useState<number>(0);
  const [activeVoicePlayer, setActiveVoicePlayer] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatTab, setChatTab] = useState<'phrases' | 'history' | 'dialect'>('phrases');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const swipedCardsRef = useRef<Set<string>>(new Set());

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanCurrent = gameState.currentPlayerIndex === 0;

  // Drag selection listeners
  useEffect(() => {
    const handleUp = () => {
      isPointerDownRef.current = false;
      swipedCardsRef.current.clear();
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  const showBubble = (playerId: string, text: string) => {
    setSpeechBubble(prev => ({ ...prev, [playerId]: text }));
    setActiveVoicePlayer(playerId);
    setTimeout(() => {
      setActiveVoicePlayer(prev => (prev === playerId ? null : prev));
    }, 2400);
    setTimeout(() => {
      setSpeechBubble(prev => {
        const next = { ...prev };
        delete next[playerId];
        return next;
      });
    }, 3200);
  };

  // Turn Countdown Timer
  useEffect(() => {
    if (gameState.phase === 'LOBBY' || gameState.phase === 'GAME_OVER' || gameState.phase === 'DEALING') {
      return;
    }

    setCountdown(isHumanCurrent ? (isAutoPlay ? 2 : 20) : 3);

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

  // Timeout action for human
  const handleTimeoutAction = () => {
    if (gameState.phase === 'PLAYING') {
      if (gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0') {
        handleHumanPass();
      } else {
        handleHumanHint();
      }
    }
  };

  // Card Selection logic
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

  const handleTouchStart = (cardId: string) => {
    swipedCardsRef.current = new Set([cardId]);
    toggleSelectCard(cardId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const cardElem = elem?.closest('[data-card-id]');
    const cardId = cardElem?.getAttribute('data-card-id');
    if (cardId && !swipedCardsRef.current.has(cardId)) {
      swipedCardsRef.current.add(cardId);
      toggleSelectCard(cardId);
    }
  };

  const handleTouchEnd = () => {
    swipedCardsRef.current.clear();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== 'PLAYING' || !isHumanCurrent || isAutoPlay) return;
      if (e.key === 'Enter') {
        if (selectedCardIds.length > 0) {
          handleHumanPlay();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0') {
          handleHumanPass();
        }
      } else if (e.key === ' ' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleHumanHint();
      } else if (e.key === 'Escape') {
        setSelectedCardIds([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, isHumanCurrent, isAutoPlay, selectedCardIds, gameState.lastValidHand]);

  // Human Play Card
  const handleHumanPlay = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent) return;
    const human = gameState.players[0];
    const cardsToPlay = human.cards.filter(c => selectedCardIds.includes(c.id));

    if (cardsToPlay.length === 0) return;

    // Check if first trick requires starter card
    if (gameState.isFirstTrick && !cardsToPlay.some(c => c.id === gameState.starterCardId)) {
      sounds.playPass();
      showBubble('player-0', '首出必须包含方块3 (♦3)！');
      return;
    }

    const hand = analyzeHand(cardsToPlay);
    if (!hand) {
      sounds.playPass();
      showBubble('player-0', '不符合锄大地牌型规则！');
      return;
    }

    // Check if can beat current trick on table
    if (
      gameState.lastValidHand &&
      gameState.lastValidHand.playerId !== human.id &&
      !canBeat(gameState.lastValidHand.hand, hand)
    ) {
      sounds.playPass();
      showBubble('player-0', '压不过桌上的牌！');
      return;
    }

    executePlay(0, cardsToPlay, hand);
    setSelectedCardIds([]);
    setHintIndex(0);
  };

  const handleHumanPass = () => {
    if (
      gameState.phase !== 'PLAYING' ||
      !isHumanCurrent ||
      !gameState.lastValidHand ||
      gameState.lastValidHand.playerId === 'player-0'
    ) {
      return;
    }
    sounds.playPass();
    executePass(0);
    setSelectedCardIds([]);
    setHintIndex(0);
  };

  // Multi-step smart hint
  const handleHumanHint = () => {
    if (gameState.phase !== 'PLAYING' || !isHumanCurrent) return;
    const human = gameState.players[0];

    if (gameState.lastValidHand && gameState.lastValidHand.playerId !== human.id) {
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
      const opening = chooseLeadingCards(human.cards, gameState.isFirstTrick, gameState.starterCardId);
      if (opening.length > 0) {
        setSelectedCardIds(opening.map(c => c.id));
        sounds.playClick();
      }
    }
  };

  // Send fast chat phrase or voice
  const handleSendChat = (phrase: string, audioUrl?: string, durationSec?: number) => {
    const isVoiceMsg = !!audioUrl;
    showBubble('player-0', phrase);
    sounds.playClick();

    const human = gameState.players[0];
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'player-0',
      senderName: human.name,
      avatar: '😎',
      type: isVoiceMsg ? 'voice' : phrase.length <= 2 && CHAT_EMOJIS.includes(phrase) ? 'emoji' : 'text',
      content: phrase,
      audioUrl,
      durationSec: durationSec || (isVoiceMsg ? 2 : undefined),
      timestamp: Date.now(),
    };

    setChatMessages(prev => [...prev.slice(-15), newMsg]);

    if (!isVoiceMsg) {
      sounds.speak(phrase, 'player-0');
    }

    // AI bot simulated voice response
    setTimeout(() => {
      const botIdx = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
      const bot = gameState.players[botIdx];
      const botReplies = [
        '哈哈，看我这把怎么打！',
        '别急别急，大牌在后头！',
        '牌打得不错嘛！',
        '稳住，这把我们必胜！',
        '配合太默契了，赞！',
        '收到收到，看我的大老二！',
      ];
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      showBubble(bot.id, reply);
      sounds.speak(reply, bot.id);

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: bot.id,
        senderName: bot.name,
        avatar: bot.avatar,
        type: 'text',
        content: reply,
        timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev.slice(-15), botMsg]);
    }, 1500);
  };

  // Start Voice Recording
  const handleStartRecord = async () => {
    try {
      setIsRecording(true);
      setRecordingSec(0);
      const success = await voiceEngine.startRecording();
      if (success) {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current);
        recordTimerRef.current = setInterval(() => {
          setRecordingSec(s => s + 1);
        }, 1000);
      } else {
        setIsRecording(false);
      }
    } catch {
      setIsRecording(false);
    }
  };

  // Stop Voice Recording
  const handleStopRecord = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const result = await voiceEngine.stopRecording();
    if (result && result.audioUrl) {
      handleSendChat(`🎙️ 语音消息 (${result.durationSec}")`, result.audioUrl, result.durationSec);
    }
  };

  // Execute Play Action
  const executePlay = (playerIdx: number, cards: Card[], hand: CardHand) => {
    const player = gameState.players[playerIdx];

    // Play card sound & Voice speech
    sounds.playCard();
    sounds.speakHand(hand.type, cards, !!gameState.lastValidHand, player.id);

    // Visual celebration banner for special 5-card hands
    if (hand.type === 'STRAIGHT_FLUSH') {
      sounds.playBomb();
      setSpecialEffectBanner({ text: '💣 同花顺！', sub: '霸气登顶横扫全场！' });
      setTimeout(() => setSpecialEffectBanner(null), 1800);
    } else if (hand.type === 'FOUR_OF_A_KIND') {
      sounds.playBomb();
      setSpecialEffectBanner({ text: '💥 铁支 (四带一)！', sub: '强力绝杀！' });
      setTimeout(() => setSpecialEffectBanner(null), 1600);
    } else if (hand.type === 'FULL_HOUSE') {
      setSpecialEffectBanner({ text: '🏠 葫芦！', sub: '三带一对！' });
      setTimeout(() => setSpecialEffectBanner(null), 1400);
    } else if (hand.type === 'FLUSH') {
      setSpecialEffectBanner({ text: '🌸 同花连连！' });
      setTimeout(() => setSpecialEffectBanner(null), 1200);
    } else if (hand.type === 'STRAIGHT') {
      setSpecialEffectBanner({ text: '🌈 顺子长龙！' });
      setTimeout(() => setSpecialEffectBanner(null), 1200);
    }

    const remainingCards = player.cards.filter(c => !cards.some(tc => tc.id === c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerIdx] = {
      ...player,
      cards: remainingCards,
    };

    showBubble(player.id, getHandDescription(hand));

    // Alarm warnings
    if (remainingCards.length === 2) {
      showBubble(player.id, '⚠️ 只剩两张牌！');
      sounds.playAlarm();
      setTimeout(() => sounds.speak('我就剩两张牌啦！', player.id), 300);
    } else if (remainingCards.length === 1) {
      showBubble(player.id, '🚨 报警！只剩一张牌！');
      sounds.playAlarm();
      setTimeout(() => sounds.speak('我就剩一张牌啦！', player.id), 300);
    }

    // Check if player cleared hand (Winner!)
    if (remainingCards.length === 0) {
      handleGameOver(playerIdx, newPlayers, hand);
      return;
    }

    const nextTurn = (playerIdx + 1) % 4;
    onUpdateState({
      ...gameState,
      players: newPlayers,
      currentPlayerIndex: nextTurn,
      lastValidHand: { playerId: player.id, hand },
      passCount: 0,
      isFirstTrick: false,
      trickLeaderIndex: playerIdx,
    });
  };

  // Execute Pass Action
  const executePass = (playerIdx: number) => {
    const player = gameState.players[playerIdx];
    const passText = voiceEngine.getActionVoiceLine('PASS');
    showBubble(player.id, passText);
    sounds.speak(passText, player.id);

    const newPassCount = gameState.passCount + 1;
    let nextLastValid = gameState.lastValidHand;
    let nextLeader = gameState.trickLeaderIndex;

    // When 3 players pass in a row, the remaining leader gets free lead!
    if (newPassCount >= 3) {
      nextLastValid = null;
    }

    const nextTurn = (playerIdx + 1) % 4;
    onUpdateState({
      ...gameState,
      currentPlayerIndex: nextTurn,
      passCount: newPassCount >= 3 ? 0 : newPassCount,
      lastValidHand: nextLastValid,
      trickLeaderIndex: nextLeader,
    });
  };

  // Game Over Settlement with Big Two Penalty Multipliers
  const handleGameOver = (winnerIdx: number, finalPlayers: Player[], finalHand: CardHand) => {
    const winner = finalPlayers[winnerIdx];
    let mult = 1;

    // Final card bonus
    const lastCardRank = finalHand.cards[0]?.rank;
    if (lastCardRank === '2') {
      mult *= 2; // Ending with 2 doubles penalty
    } else if (finalHand.type === 'FOUR_OF_A_KIND' || finalHand.type === 'STRAIGHT_FLUSH') {
      mult *= 4; // Ending with Four of a kind / Straight Flush quadruples penalty
    }

    const basePoint = gameState.room.baseScore * mult;
    let totalWonCoins = 0;

    // Coins accounting
    const settledPlayers = finalPlayers.map((p, idx) => {
      if (idx === winnerIdx) return p;

      const cardCount = p.cards.length;
      let penaltyFactor = 1;

      if (cardCount === 13) {
        penaltyFactor = 3; // 三倍关门暴击 (13x3 = 39x)
      } else if (cardCount >= 10) {
        penaltyFactor = 2; // 双倍张数惩罚
      }

      const lossCoins = cardCount * penaltyFactor * basePoint;
      totalWonCoins += lossCoins;

      return {
        ...p,
        score: Math.max(0, p.score - lossCoins),
      };
    });

    // Award total won coins to winner
    settledPlayers[winnerIdx] = {
      ...winner,
      score: winner.score + totalWonCoins,
    };

    if (winner.id === 'player-0') {
      sounds.playWin();
      sounds.playCoins();
      sounds.speak('我清盘跑清啦！第一名！', 'player-0');
    } else {
      sounds.playLose();
      sounds.speak('惨啦，被关门扣分了！', 'player-0');
    }

    onUpdateState({
      ...gameState,
      players: settledPlayers,
      phase: 'GAME_OVER',
      winnerIndex: winnerIdx,
      multiplier: mult,
    });
  };

  // AUTOPLAY LOGIC FOR HUMAN
  useEffect(() => {
    if (!isAutoPlay || !isHumanCurrent || gameState.phase !== 'PLAYING') {
      return;
    }

    const timer = setTimeout(() => {
      const human = gameState.players[0];
      const play = aiChoosePlay(
        human,
        human.cards,
        gameState.lastValidHand,
        gameState.players,
        gameState.isFirstTrick,
        gameState.starterCardId
      );

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
    }, 800);

    return () => clearTimeout(timer);
  }, [isAutoPlay, isHumanCurrent, gameState.phase, gameState.currentPlayerIndex]);

  // AI PLAYERS TURN
  useEffect(() => {
    if (isHumanCurrent || gameState.phase !== 'PLAYING') {
      return;
    }

    const curr = gameState.players[gameState.currentPlayerIndex];
    if (!curr || !curr.isAI) return;

    const timer = setTimeout(() => {
      const cardsToPlay = aiChoosePlay(
        curr,
        curr.cards,
        gameState.lastValidHand,
        gameState.players,
        gameState.isFirstTrick,
        gameState.starterCardId
      );

      if (cardsToPlay.length === 0) {
        executePass(gameState.currentPlayerIndex);
      } else {
        const hand = analyzeHand(cardsToPlay);
        if (hand) {
          executePlay(gameState.currentPlayerIndex, cardsToPlay, hand);
        } else {
          executePass(gameState.currentPlayerIndex);
        }
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.phase, gameState.lastValidHand]);

  const human = gameState.players[0] || { cards: [], name: '玩家', score: 0, position: 'bottom', id: 'player-0' };
  const botLeft = gameState.players[1] || { cards: [], name: '西家', score: 0, position: 'left', id: 'player-1', avatar: '🤖' };
  const botTop = gameState.players[2] || { cards: [], name: '北家', score: 0, position: 'top', id: 'player-2', avatar: '👑' };
  const botRight = gameState.players[3] || { cards: [], name: '东家', score: 0, position: 'right', id: 'player-3', avatar: '🐱' };

  const displayedHumanCards = sortByPattern
    ? sortCardsByRank(human.cards)
    : sortCards(human.cards);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && selectedCardIds.length > 0) {
          setSelectedCardIds([]);
        }
      }}
      className="w-full h-full flex flex-col justify-between p-1 sm:p-2 select-none"
    >
      {/* Tabletop Outer Border */}
      <div className="relative w-full h-full rounded-2xl sm:rounded-3xl border-2 sm:border-6 border-amber-950/90 bg-gradient-to-b from-[#0a3520] via-[#0d4a2d] to-[#072615] p-2 sm:p-3 shadow-2xl overflow-hidden flex flex-col justify-between">
        {/* Felt Glow Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(52,211,153,0.18)_0%,rgba(4,38,18,0.85)_75%)] pointer-events-none" />

        {/* Banner Celebrations */}
        {specialEffectBanner && (
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-slate-950 font-black text-xl sm:text-3xl px-8 py-3 rounded-full shadow-2xl border-4 border-white animate-in zoom-in-75 duration-200 flex flex-col items-center">
            <span>{specialEffectBanner.text}</span>
            {specialEffectBanner.sub && (
              <span className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">{specialEffectBanner.sub}</span>
            )}
          </div>
        )}

        {/* TOP BAR: Room Name, Multiplier, Actions */}
        <div className="relative z-10 flex items-center justify-between gap-2 bg-black/55 backdrop-blur-md px-3 sm:px-4 py-1.5 rounded-2xl border border-emerald-500/30">
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
              🔨 {gameState.room.name}
            </span>

            <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1 font-mono">
              <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>底分 {gameState.room.baseScore}</span>
            </span>
          </div>

          {/* Center Banner: Starter Card Reminder */}
          {gameState.isFirstTrick && (
            <div className="hidden md:flex items-center gap-1.5 bg-amber-500/20 px-3 py-0.5 rounded-full border border-amber-400/50 text-amber-300 text-xs font-bold animate-pulse">
              <span>♦3 (方块3) 首出局！有♦3者先发</span>
            </div>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Walkie-Talkie Hold-to-Talk Button */}
            <button
              onPointerDown={handleStartRecord}
              onPointerUp={handleStopRecord}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                  : 'bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/70 text-amber-300 shadow'
              }`}
              title="按住对讲机直接说话"
            >
              <Mic className={`w-3.5 h-3.5 ${isRecording ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isRecording ? `${recordingSec}s 松开发送` : '按住对讲'}</span>
            </button>

            {/* Quick Chat */}
            <button
              onClick={() => setShowChatModal(true)}
              className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/80 text-amber-300 hover:text-white text-xs cursor-pointer transition-colors shadow flex items-center gap-1"
              title="快捷短语与语音对讲"
            >
              <MessageSquare className="w-4 h-4" />
              {chatMessages.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              )}
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

            {/* Autoplay Toggle */}
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
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAutoPlay ? '托管中' : '托管'}</span>
            </button>
          </div>
        </div>

        {/* 4-PLAYER ARENA: Left (西家), Top (北家), Right (东家), Center Table */}
        <div className="relative z-10 grid grid-cols-12 gap-1 sm:gap-2 items-center my-auto py-1">
          {/* Left Player: 西家 */}
          <div className="col-span-2 sm:col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botLeft.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botLeft.id]}</span>
                </div>
              )}
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all relative ${
                  activeVoicePlayer === botLeft.id
                    ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                    : gameState.currentPlayerIndex === 1
                    ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105 bg-emerald-900'
                    : 'border-emerald-700/80 bg-slate-950/70'
                }`}
              >
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 drop-shadow" />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.2 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                西家
              </span>
            </div>

            <div className="text-center mt-2">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100">{botLeft.name}</div>
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 mt-0.5">
                {botLeft.cards.length <= 2 && '🚨 '}剩 {botLeft.cards.length} 张
              </div>
            </div>

            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(5, botLeft.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>

          {/* Center Battle Field & Top Player (北家) */}
          <div className="col-span-8 sm:col-span-6 flex flex-col items-center justify-between min-h-[160px] px-1">
            {/* Top Player: 北家 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full border border-emerald-500/40">
                {speechBubble[botTop.id] && (
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    <span>{speechBubble[botTop.id]}</span>
                  </div>
                )}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                    gameState.currentPlayerIndex === 2 ? 'border-amber-400 bg-amber-500/20' : 'border-emerald-600 bg-slate-900'
                  }`}
                >
                  <Bot className="w-4 h-4 text-emerald-300" />
                </div>
                <span className="text-xs font-bold text-slate-200">{botTop.name} (北家)</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  剩 {botTop.cards.length} 张
                </span>
              </div>
            </div>

            {/* Current Active Trick Cards on Felt Table */}
            {gameState.lastValidHand ? (
              <div className="flex flex-col items-center gap-1.5 my-auto">
                <div className="text-[11px] font-bold text-amber-300 bg-black/60 px-3 py-0.5 rounded-full border border-amber-500/30 shadow-lg flex items-center gap-1">
                  <span>
                    {gameState.players.find(p => p.id === gameState.lastValidHand?.playerId)?.name} 打出
                  </span>
                  <span>·</span>
                  <span className="text-emerald-300">{getHandDescription(gameState.lastValidHand.hand)}</span>
                </div>

                <div className="flex items-center justify-center gap-1 flex-wrap">
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
              <div className="my-auto text-center text-emerald-300/70 text-xs border-2 border-dashed border-emerald-500/30 px-6 py-3 rounded-2xl bg-black/25">
                {gameState.isFirstTrick
                  ? '♦3 (方块3) 首出！有方块3者优先发牌'
                  : '桌面无牌，轮到领牌者任意出牌'}
              </div>
            )}
          </div>

          {/* Right Player: 东家 */}
          <div className="col-span-2 sm:col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botRight.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botRight.id]}</span>
                </div>
              )}
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all relative ${
                  activeVoicePlayer === botRight.id
                    ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                    : gameState.currentPlayerIndex === 3
                    ? 'border-amber-400 ring-4 ring-amber-400/40 scale-105 bg-emerald-900'
                    : 'border-emerald-700/80 bg-slate-950/70'
                }`}
              >
                <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400 drop-shadow" />
              </div>
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.2 rounded-full bg-slate-800 text-emerald-300 border border-emerald-500/40">
                东家
              </span>
            </div>

            <div className="text-center mt-2">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100">{botRight.name}</div>
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 mt-0.5">
                {botRight.cards.length <= 2 && '🚨 '}剩 {botRight.cards.length} 张
              </div>
            </div>

            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(5, botRight.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Human Actions & 13 Card Hand Fan */}
        <div className="relative z-20 flex flex-col items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-emerald-500/25">
          {speechBubble['player-0'] && (
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full shadow-2xl border-2 border-white z-40 animate-bounce flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>{speechBubble['player-0']}</span>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {isHumanCurrent && gameState.phase === 'PLAYING' && (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Timer Circle */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm font-mono shadow-md border-2 border-yellow-200">
                  {countdown}
                </div>

                {/* Pass Button (if not leading) */}
                {gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0' && (
                  <button
                    onClick={handleHumanPass}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold cursor-pointer transition-all border border-slate-700"
                  >
                    不出
                  </button>
                )}

                {/* Hint Button */}
                <button
                  onClick={handleHumanHint}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 text-xs sm:text-sm font-black cursor-pointer shadow-lg active:scale-95"
                >
                  <Lightbulb className="w-4 h-4 fill-current" />
                  <span>提示</span>
                </button>

                {/* Reset Selection */}
                {selectedCardIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCardIds([])}
                    className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-amber-200 text-xs sm:text-sm font-bold cursor-pointer transition-all"
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

          {/* 13 Overlapping Cards Fan */}
          <div
            className="w-full flex items-center justify-center overflow-x-auto py-1 px-1"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex -space-x-7 sm:-space-x-9 md:-space-x-11 lg:-space-x-12 shrink-0">
              {displayedHumanCards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    onPointerDown={() => handleCardPointerDown(card.id)}
                    onPointerEnter={() => handleCardPointerEnter(card.id)}
                    onTouchStart={() => handleTouchStart(card.id)}
                    className="shrink-0 select-none cursor-pointer"
                  >
                    <SvgCard
                      card={card}
                      isSelected={isSelected}
                      size="lg"
                      className="pointer-events-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Info Bar: Player Name, Card Count, Sort Mode */}
          <div className="flex items-center justify-between w-full px-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100">{human.name} (南家)</span>
            </div>

            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <button
                onClick={() => {
                  sounds.playClick();
                  setSortByPattern(prev => !prev);
                }}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 cursor-pointer text-[11px] font-bold"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-400" />
                <span>理牌: {sortByPattern ? '按点数' : '按大小'}</span>
              </button>

              <span>
                手牌: <strong className="text-slate-100 font-mono">{human.cards.length}</strong> 张
              </span>
              <span>
                金币: <strong className="text-amber-400 font-mono">{human.score.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Chat Modal */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3">
            <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl max-w-md w-full p-4 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setChatTab('phrases')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chatTab === 'phrases'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      💬 快捷短语
                    </button>
                    <button
                      onClick={() => setChatTab('history')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatTab === 'history'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>对讲记录</span>
                    </button>
                    <button
                      onClick={() => setChatTab('dialect')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chatTab === 'dialect'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🌐 方言配音
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {chatTab === 'phrases' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-around bg-slate-950 p-2 rounded-2xl border border-slate-800">
                    {CHAT_EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendChat(emoji);
                          setShowChatModal(false);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-95 cursor-pointer p-1"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    <input
                      type="text"
                      value={customChatText}
                      onChange={(e) => setCustomChatText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customChatText.trim()) {
                          handleSendChat(customChatText.trim());
                          setCustomChatText('');
                          setShowChatModal(false);
                        }
                      }}
                      placeholder="输入文本，真人语音自动播报..."
                      className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (customChatText.trim()) {
                          handleSendChat(customChatText.trim());
                          setCustomChatText('');
                          setShowChatModal(false);
                        }
                      }}
                      disabled={!customChatText.trim()}
                      className="p-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {CHAT_PHRASES.map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendChat(phrase);
                          setShowChatModal(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          <Radio className="w-3.5 h-3.5 text-amber-400" />
                          <span>{phrase}</span>
                        </span>
                        <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100">
                          播报 ➔
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatTab === 'history' && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/40 flex flex-col items-center gap-2">
                    <button
                      onPointerDown={handleStartRecord}
                      onPointerUp={handleStopRecord}
                      className={`w-full py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isRecording ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-600 text-white shadow'
                      }`}
                    >
                      <Mic className="w-5 h-5" />
                      <span>{isRecording ? '松开即发送语音' : '按住说话 (语音对讲)'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">暂无语音记录，按住对讲说话！</div>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className="p-2 rounded-xl bg-slate-800/70 text-xs text-slate-200">
                          <span className="font-bold text-amber-300">{msg.senderName}: </span>
                          <span>{msg.content}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {chatTab === 'dialect' && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-2">
                    {DIALECT_OPTIONS.map(d => {
                      const isActive = voiceEngine.dialect === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            voiceEngine.setDialect(d.id);
                            sounds.speak(`已切换为${d.label}！`);
                          }}
                          className={`p-2.5 rounded-xl border text-left flex items-center justify-between ${
                            isActive ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{d.icon}</span>
                            <span className="font-bold text-xs text-white">{d.label}</span>
                          </div>
                          <span className="text-xs text-amber-400">{isActive ? '当前' : '试听'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Victory / Defeat Settlement Modal */}
        {gameState.phase === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-lg w-full p-4 sm:p-5 text-center shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  🏆 [{gameState.players[gameState.winnerIndex!]?.name}] 率先清盘夺冠！
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  场次底分: <span className="text-amber-400 font-bold font-mono">{gameState.room.baseScore} 积分</span>
                  {gameState.multiplier > 1 && ` (终盘加倍 x${gameState.multiplier})`}
                </p>
              </div>

              {/* 4 Players Remaining Cards Open Settlement Recap */}
              <div className="w-full bg-slate-950/80 rounded-2xl p-3 border border-slate-800 text-xs space-y-2 text-left">
                {gameState.players.map(p => {
                  const isWinner = p.id === gameState.players[gameState.winnerIndex!]?.id;
                  const isShutout = p.cards.length === 13;
                  const isDoublePenalty = p.cards.length >= 10 && p.cards.length < 13;

                  return (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-bold flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {isWinner && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                              第一名胜出
                            </span>
                          )}
                          {isShutout && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-600/30 text-rose-400 font-bold">
                              关门三倍惩罚
                            </span>
                          )}
                          {isDoublePenalty && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 font-bold">
                              双倍惩罚 (≥10张)
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-amber-400 font-bold text-xs sm:text-sm">
                          {p.score.toLocaleString()} 积分
                        </span>
                      </div>

                      {/* Remaining Cards */}
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {p.cards.length === 0 ? '手牌出尽' : `剩牌(${p.cards.length}):`}
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
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full">
                <button
                  onClick={onBackToLobby}
                  className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm cursor-pointer transition-all"
                >
                  返回大厅
                </button>
                <button
                  onClick={onChangeTable || onStartNewGame}
                  className="py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>换桌对战</span>
                </button>
                <button
                  onClick={onStartNewGame}
                  className="py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/40 cursor-pointer transition-all active:scale-95"
                >
                  再来一局
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
