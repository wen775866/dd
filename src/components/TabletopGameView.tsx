import React, { useState, useEffect, useRef } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import {
  SUIT_SYMBOLS,
  analyzeHand,
  canBeat,
  getHandDescription,
  sortCards,
  sortCardsByRank,
  calculateSettlement,
  getEffectiveCards,
  calculateMatchSettlement,
} from '../utils/chudadiRules';
import {
  aiChoosePlay,
  chooseLeadingCards,
  findBeatingHands,
} from '../utils/chudadiAI';
import { sounds } from '../utils/audio';
import { useAppTheme } from '../utils/themeContext';
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
  Palette,
} from 'lucide-react';
import { voiceEngine, DIALECT_OPTIONS, VoiceDialect, ChatMessage } from '../utils/voiceSystem';

interface TabletopGameViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
  onStartNewMatch?: () => void;
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
  onStartNewMatch,
  onChangeTable,
  onBackToLobby,
  soundEnabled,
  onToggleSound,
}) => {
  const { theme, toggleTheme, themeConfig } = useAppTheme();
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{ [playerId: string]: string }>({});
  const [passStatuses, setPassStatuses] = useState<{ [playerId: string]: { text: string; timestamp: number } }>({});
  const [countdown, setCountdown] = useState<number>(20);

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

    let initialCountdown = isHumanCurrent ? (isAutoPlay ? 2 : 20) : 3;
    setCountdown(initialCountdown);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      initialCountdown -= 1;
      if (initialCountdown <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setCountdown(0);
        if (isHumanCurrent) {
          handleTimeoutAction();
        }
      } else {
        setCountdown(initialCountdown);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.currentPlayerIndex, gameState.phase, isAutoPlay]);

  // Clear pass status for active player when their turn starts so avatar image restores
  useEffect(() => {
    if (gameState.phase === 'PLAYING') {
      const curPlayer = gameState.players[gameState.currentPlayerIndex];
      if (curPlayer && passStatuses[curPlayer.id]) {
        setPassStatuses(prev => {
          const next = { ...prev };
          delete next[curPlayer.id];
          return next;
        });
      }
    }
  }, [gameState.currentPlayerIndex, gameState.phase]);

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

  const handleCardClick = (cardId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    toggleSelectCard(cardId);
  };

  const handleCardPointerDown = (cardId: string) => {
    isPointerDownRef.current = true;
    swipedCardsRef.current = new Set([cardId]);
  };

  const handleCardPointerEnter = (cardId: string) => {
    if (isPointerDownRef.current && !swipedCardsRef.current.has(cardId)) {
      swipedCardsRef.current.add(cardId);
      toggleSelectCard(cardId);
    }
  };

  const handleTouchStart = (cardId: string) => {
    swipedCardsRef.current = new Set([cardId]);
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

    // Check if first trick requires starter card (diamond-2)
    if (gameState.isFirstTrick && gameState.starterCardId && !cardsToPlay.some(c => c.id === gameState.starterCardId)) {
      sounds.playPass();
      showBubble('player-0', '首出必须包含方块2 (♦2)！');
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
      showBubble('player-0', `压不过【${getHandDescription(gameState.lastValidHand.hand)}】！`);
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
      const bestMove = aiChoosePlay(
        human,
        human.cards,
        gameState.lastValidHand,
        gameState.players,
        gameState.isFirstTrick,
        gameState.starterCardId
      );
      const candidates = findBeatingHands(human.cards, gameState.lastValidHand.hand);
      if (candidates.length === 0 || (bestMove.length === 0 && candidates.length === 0)) {
        showBubble('player-0', '要不起，请点不出~');
      } else {
        // 第一下提示优先展示宗师级 AI 推荐的最优出牌
        let candidateCards = bestMove.length > 0 ? bestMove : candidates[0].cards;
        if (hintIndex > 0 && candidates.length > 1) {
          const candidate = candidates[(hintIndex - 1) % candidates.length];
          candidateCards = candidate.cards;
        }
        setSelectedCardIds(candidateCards.map(c => c.id));
        setHintIndex(prev => prev + 1);
        sounds.playClick();
      }
    } else {
      const opening = chooseLeadingCards(
        human.cards,
        gameState.isFirstTrick,
        gameState.starterCardId,
        gameState.players,
        human.id
      );
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
      if (phrase === '💣') {
        sounds.playBomb();
      } else if (phrase === '👍' || phrase === '🌹') {
        sounds.playWin();
      } else {
        sounds.speak(phrase, 'player-0');
      }
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

    // Clear pass status for this player when they play cards
    setPassStatuses(prev => {
      if (!prev[player.id]) return prev;
      const next = { ...prev };
      delete next[player.id];
      return next;
    });

    // Play card sound & Voice speech
    sounds.playCard();
    sounds.speakHand(hand.type, cards, !!gameState.lastValidHand, player.id);

    // Play bomb sound effect for big hands without popping up banner
    if (hand.type === 'STRAIGHT_FLUSH' || hand.type === 'FOUR_OF_A_KIND') {
      sounds.playBomb();
    }

    const remainingCards = player.cards.filter(c => !cards.some(tc => tc.id === c.id));
    const newPlayers = [...gameState.players];
    newPlayers[playerIdx] = {
      ...player,
      cards: remainingCards,
    };

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
    sounds.speak(passText, player.id);

    // Record '要不起' or '过' on player's avatar frame
    const passLabel = gameState.lastValidHand ? '要不起' : '过';
    setPassStatuses(prev => ({
      ...prev,
      [player.id]: { text: passLabel, timestamp: Date.now() },
    }));

    const newPassCount = gameState.passCount + 1;
    let nextLastValid = gameState.lastValidHand;
    let nextLeader = gameState.trickLeaderIndex;

    // When 3 players pass in a row, the remaining leader gets free lead!
    let nextTurn = (playerIdx + 1) % 4;
    if (newPassCount >= 3) {
      nextLastValid = null;
      if (typeof nextLeader === 'number') {
        nextTurn = nextLeader;
      }
      setTimeout(() => {
        setPassStatuses({});
      }, 1200);
    }

    onUpdateState({
      ...gameState,
      currentPlayerIndex: nextTurn,
      passCount: newPassCount >= 3 ? 0 : newPassCount,
      lastValidHand: nextLastValid,
      trickLeaderIndex: nextLeader,
    });
  };

  // Game Over Round / Match Handler
  const handleGameOver = (winnerIdx: number, finalPlayers: Player[], finalHand: CardHand) => {
    const winner = finalPlayers[winnerIdx];

    // Calculate effective cards for this round and accumulate for each player
    const updatedPlayers = finalPlayers.map((p, idx) => {
      const rawCount = p.cards ? p.cards.length : 0;
      const effRound = getEffectiveCards(rawCount).effective;
      const prevAcc = p.accumulatedCards || 0;
      return {
        ...p,
        accumulatedCards: prevAcc + effRound,
      };
    });

    // Check if any player's accumulated cards >= 100 (Triggers Match Final Settlement!)
    const matchEnded = updatedPlayers.some(p => p.accumulatedCards >= 100);

    if (matchEnded) {
      // Calculate final match score settlement with rounding to tens (四舍五入)
      const matchSettlements = calculateMatchSettlement(updatedPlayers, gameState.room.baseScore);
      const settledPlayers = updatedPlayers.map((p, idx) => {
        const st = matchSettlements.find(s => s.playerIndex === idx);
        return {
          ...p,
          score: st ? st.finalScore : p.score,
        };
      });

      if (winner.id === 'player-0') {
        sounds.playWin();
        sounds.playCoins();
        sounds.speak('比赛结束！大结算发分啦！', 'player-0');
      } else {
        sounds.playLose();
        sounds.speak('比赛结束，大结算算分啦！', 'player-0');
      }

      onUpdateState({
        ...gameState,
        players: settledPlayers,
        phase: 'MATCH_SETTLEMENT',
        winnerIndex: winnerIdx,
      });
    } else {
      // Round Summary (Keep playing, accumulate cards, winner leads next round!)
      if (winner.id === 'player-0') {
        sounds.playWin();
        sounds.speak('本局胜利！下局由我优先出牌！', 'player-0');
      } else {
        sounds.playClick();
        sounds.speak(`本局结束，下局由${winner.name}优先出牌！`, 'player-0');
      }

      onUpdateState({
        ...gameState,
        players: updatedPlayers,
        phase: 'ROUND_SUMMARY',
        winnerIndex: winnerIdx,
      });
    }
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
  const botRight = gameState.players[1] || { cards: [], name: '东家', score: 0, position: 'right', id: 'player-1', avatar: '🐱' };
  const botTop = gameState.players[2] || { cards: [], name: '北家', score: 0, position: 'top', id: 'player-2', avatar: '👑' };
  const botLeft = gameState.players[3] || { cards: [], name: '西家', score: 0, position: 'left', id: 'player-3', avatar: '🤖' };

  const displayedHumanCards = sortByPattern
    ? sortCardsByRank(human.cards)
    : sortCards(human.cards);

  // Real-time analysis of player's currently selected cards
  const selectedCardsList = human.cards.filter(c => selectedCardIds.includes(c.id));
  const analyzedSelectedHand = selectedCardsList.length > 0 ? analyzeHand(selectedCardsList) : null;
  const canPlaySelectedHand =
    analyzedSelectedHand !== null &&
    (!gameState.isFirstTrick || !gameState.starterCardId || selectedCardsList.some(c => c.id === gameState.starterCardId)) &&
    (!gameState.lastValidHand || gameState.lastValidHand.playerId === human.id || canBeat(gameState.lastValidHand.hand, analyzedSelectedHand));

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && selectedCardIds.length > 0) {
          setSelectedCardIds([]);
        }
      }}
      className="w-full h-full flex flex-col justify-between p-0.5 sm:p-1.5 select-none"
    >
      {/* Tabletop Outer Border */}
      <div 
        className={`relative w-full h-full rounded-xl sm:rounded-2xl border sm:border-4 shadow-2xl overflow-hidden flex flex-col justify-between transition-colors duration-300 p-1 sm:p-2.5 ${
          theme === 'deep-green'
            ? 'border-[#0e3b28] bg-gradient-to-b from-[#186443] via-[#23855a] to-[#155b3c]'
            : 'border-[#0d344d] bg-gradient-to-b from-[#18608f] via-[#237eb5] to-[#14537c]'
        }`}
      >
        {/* Felt Glow Accent */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            background: theme === 'deep-green'
              ? 'radial-gradient(ellipse at center, rgba(52,211,153,0.18) 0%, rgba(16,69,47,0.3) 85%)'
              : 'radial-gradient(ellipse at center, rgba(56,189,248,0.18) 0%, rgba(16,63,94,0.3) 85%)'
          }}
        />

        {/* TOP HEADER: Split into Left Floating Bar, Center Top Player Avatar (北家), Right Floating Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 w-full px-1.5 sm:px-3 py-1 shrink-0">
          {/* Top-Left Floating Info Bar */}
          <div 
            className={`flex items-center gap-1.5 sm:gap-2 backdrop-blur-md px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-2xl border shadow-lg transition-colors duration-300 ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/40 text-emerald-50'
                : 'bg-[#134d73]/90 border-cyan-400/40 text-cyan-50'
            }`}
          >
            <button
              onClick={() => {
                sounds.playClick();
                onBackToLobby();
              }}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] text-emerald-200 border-emerald-400/50'
                  : 'bg-[#0f3f5f]/90 hover:bg-[#165882] text-cyan-200 border-cyan-400/50'
              }`}
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>大厅</span>
            </button>

            <span className="text-xs font-black text-amber-300 hidden sm:inline">
              🔨 {gameState.room.name}
            </span>

            <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border ${
              theme === 'deep-green'
                ? 'bg-[#0f402c]/90 text-amber-300 border-emerald-400/40'
                : 'bg-[#0f3f5f]/90 text-amber-300 border-cyan-400/40'
            }`}>
              第 {gameState.matchNumber || 1} 场 · 第 {gameState.roundNumber || 1} 局
            </span>

            <span className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1 font-mono">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>底分 {gameState.room.baseScore}</span>
            </span>
          </div>

          {/* Center-Top Player: 北家 (Identical size and structure to West & East avatars!) */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {speechBubble[botTop.id] && (
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botTop.id]}</span>
                </div>
              )}
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all relative overflow-hidden ${
                  activeVoicePlayer === botTop.id
                    ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                    : gameState.currentPlayerIndex === 2
                    ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/20'
                    : theme === 'deep-green'
                    ? 'border-emerald-500/60 bg-[#0f402c]/80'
                    : 'border-cyan-500/60 bg-[#0f3f5f]/80'
                }`}
              >
                {passStatuses[botTop.id] ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white font-black text-xs sm:text-base flex items-center justify-center animate-in zoom-in-75 duration-150">
                    <span>{passStatuses[botTop.id].text}</span>
                  </div>
                ) : (
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 drop-shadow" />
                )}
              </div>
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.2 rounded-full border ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c] text-emerald-200 border-emerald-400/40'
                  : 'bg-[#0f3f5f] text-cyan-200 border-cyan-400/40'
              }`}>
                北家
              </span>
            </div>

            <div className="text-center mt-1.5">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100">{botTop.name}</div>
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-200 mt-0.5 flex items-center justify-center gap-1">
                <span>{botTop.cards.length <= 2 && '🚨 '}手牌 {botTop.cards.length} 张</span>
                <span className="text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/30">累计{botTop.accumulatedCards || 0}</span>
              </div>
            </div>
          </div>

          {/* Top-Right Floating Controls Bar */}
          <div 
            className={`flex items-center gap-1 sm:gap-2 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl border shadow-lg transition-colors duration-300 ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/40 text-emerald-50'
                : 'bg-[#134d73]/90 border-cyan-400/40 text-cyan-50'
            }`}
          >
            {/* Eye-Friendly Theme Toggle */}
            <button
              onClick={() => {
                sounds.playClick();
                toggleTheme();
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] border-emerald-400/60 text-emerald-200'
                  : 'bg-[#0f3f5f]/90 hover:bg-[#165882] border-cyan-400/60 text-cyan-200'
              }`}
              title="切换养眼护眼主题 (翡翠草绿 / 湖水湛蓝)"
            >
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{theme === 'deep-green' ? '翡翠绿' : '湖水蓝'}</span>
            </button>

            {/* Walkie-Talkie Hold-to-Talk Button */}
            <button
              onPointerDown={handleStartRecord}
              onPointerUp={handleStopRecord}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse ring-2 ring-red-400'
                  : theme === 'deep-green'
                  ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] border border-emerald-400/70 text-amber-300 shadow'
                  : 'bg-[#0f3f5f]/90 hover:bg-[#165882] border border-cyan-400/70 text-amber-300 shadow'
              }`}
              title="按住对讲机直接说话"
            >
              <Mic className={`w-3.5 h-3.5 ${isRecording ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isRecording ? `${recordingSec}s 松开发送` : '按住对讲'}</span>
            </button>

            {/* Quick Chat */}
            <button
              onClick={() => setShowChatModal(true)}
              className={`p-1.5 rounded-lg border text-amber-300 hover:text-white text-xs cursor-pointer transition-colors shadow flex items-center gap-1 ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c]/90 border-emerald-400/60'
                  : 'bg-[#0f3f5f]/90 border-cyan-400/60'
              }`}
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
                  ? theme === 'deep-green'
                    ? 'bg-[#0f402c] border-emerald-400 text-emerald-200'
                    : 'bg-[#0f3f5f] border-cyan-400 text-cyan-200'
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
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/40 animate-pulse ring-2 ring-amber-300 font-black'
                  : theme === 'deep-green'
                  ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] text-emerald-100 border border-emerald-400/60'
                  : 'bg-[#0f3f5f]/90 hover:bg-[#165882] text-cyan-100 border border-cyan-400/60'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>{isAutoPlay ? '托管中' : '托管'}</span>
            </button>
          </div>
        </div>

        {/* 4-PLAYER ARENA: Left (西家), Center Table, Right (东家) */}
        <div className="relative z-10 grid grid-cols-12 gap-1 sm:gap-2 items-center my-auto py-1">
          {/* Left Player: 西家 */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botLeft.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botLeft.id]}</span>
                </div>
              )}
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all relative overflow-hidden ${
                  activeVoicePlayer === botLeft.id
                    ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                    : gameState.currentPlayerIndex === 3
                    ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/20'
                    : theme === 'deep-green'
                    ? 'border-emerald-500/60 bg-[#0f402c]/80'
                    : 'border-cyan-500/60 bg-[#0f3f5f]/80'
                }`}
              >
                {passStatuses[botLeft.id] ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white font-black text-xs sm:text-base flex items-center justify-center animate-in zoom-in-75 duration-150">
                    <span>{passStatuses[botLeft.id].text}</span>
                  </div>
                ) : (
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 drop-shadow" />
                )}
              </div>
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.2 rounded-full border ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c] text-emerald-200 border-emerald-400/40'
                  : 'bg-[#0f3f5f] text-cyan-200 border-cyan-400/40'
              }`}>
                西家
              </span>
            </div>

            <div className="text-center mt-2">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100">{botLeft.name}</div>
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-200 mt-0.5 flex items-center justify-center gap-1">
                <span>{botLeft.cards.length <= 2 && '🚨 '}手牌 {botLeft.cards.length} 张</span>
                <span className="text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/30">累计{botLeft.accumulatedCards || 0}</span>
              </div>
            </div>

            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(5, botLeft.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>

          {/* Center Battle Field */}
          <div className="col-span-6 flex flex-col items-center justify-center min-h-[140px] px-1">
            {/* Current Active Trick Cards on Felt Table */}
            {gameState.lastValidHand ? (
              <div className="flex flex-col items-center gap-1.5 my-auto">
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
              <div className={`my-auto text-center text-xs border-2 border-dashed px-6 py-2.5 rounded-2xl ${
                theme === 'deep-green'
                  ? 'text-emerald-100/90 border-emerald-300/40 bg-[#0f402c]/40'
                  : 'text-cyan-100/90 border-cyan-300/40 bg-[#0f3f5f]/40'
              }`}>
                {gameState.isFirstTrick
                  ? '♦2 (方块2) 首出！首出牌型中必须包含♦2 (逆时针出牌)'
                  : '桌面无牌，轮到领牌者任意出牌'}
              </div>
            )}
          </div>

          {/* Right Player: 东家 */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botRight.id] && (
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-black px-3.5 py-1 rounded-full shadow-2xl border-2 border-amber-400 z-30 animate-bounce flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{speechBubble[botRight.id]}</span>
                </div>
              )}
              <div
                className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl border-2 transition-all relative overflow-hidden ${
                  activeVoicePlayer === botRight.id
                    ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300'
                    : gameState.currentPlayerIndex === 1
                    ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_18px_rgba(239,68,68,0.95)] animate-pulse scale-105 bg-red-500/20'
                    : theme === 'deep-green'
                    ? 'border-emerald-500/60 bg-[#0f402c]/80'
                    : 'border-cyan-500/60 bg-[#0f3f5f]/80'
                }`}
              >
                {passStatuses[botRight.id] ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white font-black text-xs sm:text-base flex items-center justify-center animate-in zoom-in-75 duration-150">
                    <span>{passStatuses[botRight.id].text}</span>
                  </div>
                ) : (
                  <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300 drop-shadow" />
                )}
              </div>
              <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black px-2 py-0.2 rounded-full border ${
                theme === 'deep-green'
                  ? 'bg-[#0f402c] text-emerald-200 border-emerald-400/40'
                  : 'bg-[#0f3f5f] text-cyan-200 border-cyan-400/40'
              }`}>
                东家
              </span>
            </div>

            <div className="text-center mt-2">
              <div className="text-[11px] sm:text-xs font-bold text-slate-100">{botRight.name}</div>
              <div className="text-[10px] sm:text-[11px] font-mono font-bold text-emerald-200 mt-0.5 flex items-center justify-center gap-1">
                <span>{botRight.cards.length <= 2 && '🚨 '}手牌 {botRight.cards.length} 张</span>
                <span className="text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-500/30">累计{botRight.accumulatedCards || 0}</span>
              </div>
            </div>

            <div className="flex -space-x-5 mt-1">
              {Array.from({ length: Math.min(5, botRight.cards.length) }).map((_, i) => (
                <SvgCard key={i} showBack={true} size="mini" className="shadow-md" />
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Human Actions & 13 Card Hand Fan (Border-free, Tabletop Felt matching background, Fixed stable height) */}
        <div className="relative z-20 flex flex-col items-center w-full bg-transparent shrink-0">
          {speechBubble['player-0'] && (
            <div className="absolute -top-11 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-full shadow-2xl border-2 border-white z-40 animate-bounce flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
              <span>{speechBubble['player-0']}</span>
            </div>
          )}

          {/* Action Buttons Row & Info: Fixed constant height to prevent any border/height shifts */}
          <div className="flex items-center justify-between w-full px-2 sm:px-4 h-8 sm:h-9 shrink-0 select-none">
            {/* Left: Player Identity & Sort Switch */}
            <div className="flex items-center gap-1.5 text-xs text-white">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center border transition-all relative overflow-hidden shrink-0 ${
                  gameState.currentPlayerIndex === 0
                    ? 'border-2 border-red-500 ring-4 ring-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse scale-105 bg-red-500/20'
                    : theme === 'deep-green'
                    ? 'border-emerald-400/50 bg-[#0f402c]'
                    : 'border-cyan-400/50 bg-[#0f3f5f]'
                }`}
              >
                {passStatuses['player-0'] ? (
                  <div className="w-full h-full bg-gradient-to-br from-red-600 via-rose-600 to-red-800 text-white font-black text-[10px] sm:text-xs flex items-center justify-center animate-in zoom-in-75 duration-150">
                    <span>{passStatuses['player-0'].text}</span>
                  </div>
                ) : (
                  <User className="w-3.5 h-3.5 text-amber-300" />
                )}
              </div>
              <span className="font-bold text-slate-100">{human.name} (南家)</span>
              <button
                onClick={() => {
                  sounds.playClick();
                  setSortByPattern(prev => !prev);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border cursor-pointer text-[10px] font-bold ml-1 shadow-sm ${
                  theme === 'deep-green'
                    ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] text-amber-300 border-emerald-400/50'
                    : 'bg-[#0f3f5f]/90 hover:bg-[#165882] text-amber-300 border-cyan-400/50'
                }`}
              >
                <SlidersHorizontal className="w-2.5 h-2.5 text-amber-400" />
                <span>{sortByPattern ? '按点数' : '按大小'}</span>
              </button>
            </div>

            {/* Center: Action Buttons or Thinking Pill */}
            <div className="flex items-center justify-center h-full">
              {isHumanCurrent && gameState.phase === 'PLAYING' ? (
                <div className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in zoom-in-95 duration-150">
                  {/* Timer Circle */}
                  <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-slate-950 font-black text-xs font-mono shadow-md border-2 border-yellow-200">
                    {countdown}
                  </div>

                  {/* Pass Button (if not leading) */}
                  {gameState.lastValidHand && gameState.lastValidHand.playerId !== 'player-0' && (
                    <button
                      onClick={handleHumanPass}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all border shadow ${
                        theme === 'deep-green'
                          ? 'bg-[#0f402c]/90 hover:bg-[#165a3d] text-slate-100 border-emerald-400/50'
                          : 'bg-[#0f3f5f]/90 hover:bg-[#165882] text-slate-100 border-cyan-400/50'
                      }`}
                    >
                      不出
                    </button>
                  )}

                  {/* Hint Button */}
                  <button
                    onClick={handleHumanHint}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 text-xs font-black cursor-pointer shadow-lg active:scale-95"
                  >
                    <Lightbulb className="w-3.5 h-3.5 fill-current" />
                    <span>提示</span>
                  </button>

                  {/* Reset Selection */}
                  {selectedCardIds.length > 0 && (
                    <button
                      onClick={() => setSelectedCardIds([])}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold cursor-pointer transition-all border shadow ${
                        theme === 'deep-green'
                          ? 'bg-[#185e42]/90 hover:bg-[#207553] text-amber-200 border-emerald-400/50'
                          : 'bg-[#185c8a]/90 hover:bg-[#2072a8] text-amber-200 border-cyan-400/50'
                      }`}
                    >
                      重选
                    </button>
                  )}

                  {/* Play Button with live hand recognition */}
                  <button
                    onClick={handleHumanPlay}
                    disabled={selectedCardIds.length === 0}
                    className={`flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-xs font-black shadow-xl transition-all cursor-pointer ${
                      canPlaySelectedHand
                        ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 text-slate-950 shadow-emerald-500/50 scale-105 active:scale-100 ring-2 ring-white'
                        : selectedCardIds.length > 0
                        ? 'bg-amber-600 text-white hover:bg-amber-500 active:scale-95 shadow'
                        : 'bg-[#0f402c]/60 text-emerald-200/50 cursor-not-allowed border border-emerald-500/30'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {analyzedSelectedHand ? getHandDescription(analyzedSelectedHand) : `出牌 (${selectedCardIds.length})`}
                    </span>
                  </button>
                </div>
              ) : !isHumanCurrent && gameState.phase !== 'GAME_OVER' ? (
                <div className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 ${
                  theme === 'deep-green'
                    ? 'bg-[#0f402c]/80 border-emerald-400/40 text-amber-300'
                    : 'bg-[#0f3f5f]/80 border-cyan-400/40 text-amber-300'
                }`}>
                  <Bot className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                  <span>{currentPlayer?.name || '其他玩家'} 正在思考中...</span>
                </div>
              ) : (
                <div className="h-6" />
              )}
            </div>

            {/* Right: Scores & Cards Count */}
            <div className="flex items-center gap-2 text-[11px] text-emerald-50">
              <span>
                手牌 <strong className="text-white font-mono">{human.cards.length}</strong> 张
              </span>
              <span className="text-amber-300 font-bold bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                累计 <strong className="font-mono">{human.accumulatedCards || 0}</strong>/100张
              </span>
              <span>
                积分 <strong className="text-amber-300 font-mono">{human.score.toLocaleString()}</strong>
              </span>
            </div>
          </div>

          {/* 13 Overlapping Cards Fan: Completely visible with full top and bottom margins, never clipped */}
          <div
            className="w-full flex items-center justify-center overflow-x-auto overflow-y-visible pt-4 pb-2 px-2 shrink-0 min-h-[96px] sm:min-h-[115px]"
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flex -space-x-7 sm:-space-x-9 md:-space-x-11 lg:-space-x-13 shrink-0">
              {displayedHumanCards.map(card => {
                const isSelected = selectedCardIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    data-card-id={card.id}
                    onClick={(e) => handleCardClick(card.id, e)}
                    onPointerDown={() => handleCardPointerDown(card.id)}
                    onPointerEnter={() => handleCardPointerEnter(card.id)}
                    onTouchStart={() => handleTouchStart(card.id)}
                    className="shrink-0 select-none cursor-pointer"
                  >
                    <SvgCard
                      card={card}
                      isSelected={isSelected}
                      size="lg"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Chat Modal - Optimized for Landscape */}
        {showChatModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none">
            <div 
              className={`border-2 rounded-3xl max-w-xl w-full p-3 sm:p-3.5 shadow-2xl flex flex-col gap-2.5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-hidden transition-colors ${
                theme === 'deep-green'
                  ? 'bg-[#145339] border-emerald-400/70 text-emerald-50'
                  : 'bg-[#144f75] border-cyan-400/70 text-cyan-50'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/15 pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <div 
                    className={`flex p-1 rounded-xl border ${
                      theme === 'deep-green'
                        ? 'bg-[#0a2e1f]/90 border-emerald-400/20'
                        : 'bg-[#0a2b40]/90 border-cyan-400/20'
                    }`}
                  >
                    <button
                      onClick={() => setChatTab('phrases')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chatTab === 'phrases'
                          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      💬 快捷短语
                    </button>
                    <button
                      onClick={() => setChatTab('history')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        chatTab === 'history'
                          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>对讲记录</span>
                    </button>
                    <button
                      onClick={() => setChatTab('dialect')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chatTab === 'dialect'
                          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                          : 'text-white/70 hover:text-white'
                      }`}
                    >
                      🌐 方言配音
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowChatModal(false)}
                  className="text-white/70 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {chatTab === 'phrases' && (
                <div className="flex flex-col gap-2 flex-1 min-h-0">
                  <div 
                    className={`flex items-center justify-around p-1.5 rounded-2xl border shrink-0 ${
                      theme === 'deep-green'
                        ? 'bg-[#0e3b28]/95 border-emerald-400/30'
                        : 'bg-[#0e3752]/95 border-cyan-400/30'
                    }`}
                  >
                    {CHAT_EMOJIS.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendChat(emoji);
                          setShowChatModal(false);
                        }}
                        className="text-2xl hover:scale-125 transition-transform active:scale-95 cursor-pointer p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <div 
                    className={`flex items-center gap-1.5 p-1.5 rounded-2xl border shrink-0 ${
                      theme === 'deep-green'
                        ? 'bg-[#0e3b28]/95 border-emerald-400/30'
                        : 'bg-[#0e3752]/95 border-cyan-400/30'
                    }`}
                  >
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
                      className="flex-1 bg-transparent px-2.5 py-1 text-xs text-white placeholder-white/40 focus:outline-none"
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
                      className="p-2 rounded-xl text-xs font-bold bg-amber-400 text-slate-950 shadow cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {CHAT_PHRASES.map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          handleSendChat(phrase);
                          setShowChatModal(false);
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-xl border text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-between group ${
                          theme === 'deep-green'
                            ? 'bg-[#0e3b28]/80 hover:bg-[#114732] border-emerald-400/30'
                            : 'bg-[#0e3752]/80 hover:bg-[#12476b] border-cyan-400/30'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <Radio className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{phrase}</span>
                        </span>
                        <span className="text-[10px] text-amber-300 opacity-0 group-hover:opacity-100 shrink-0 font-bold">
                          播报➔
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatTab === 'history' && (
                <div className="flex flex-col gap-2.5 flex-1 min-h-0">
                  <div 
                    className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 shrink-0 ${
                      theme === 'deep-green'
                        ? 'bg-[#0e3b28]/95 border-emerald-400/40'
                        : 'bg-[#0e3752]/95 border-cyan-400/40'
                    }`}
                  >
                    <button
                      onPointerDown={handleStartRecord}
                      onPointerUp={handleStopRecord}
                      className={`w-full py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isRecording 
                          ? 'bg-rose-600 text-white animate-pulse' 
                          : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      <span>{isRecording ? '松开即发送语音' : '按住说话 (语音对讲)'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {chatMessages.length === 0 ? (
                      <div className="text-center py-4 text-white/50 text-xs">暂无语音记录，按住对讲说话！</div>
                    ) : (
                      chatMessages.map(msg => (
                        <div 
                          key={msg.id} 
                          className={`p-2 rounded-xl text-xs text-white border ${
                            theme === 'deep-green'
                              ? 'bg-[#0e3b28]/80 border-emerald-400/30'
                              : 'bg-[#0e3752]/80 border-cyan-400/30'
                          }`}
                        >
                          <span className="font-bold text-amber-300">{msg.senderName}: </span>
                          <span>{msg.content}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {chatTab === 'dialect' && (
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-2">
                    {DIALECT_OPTIONS.map(d => {
                      const isActive = voiceEngine.dialect === d.id;
                      return (
                        <button
                          key={d.id}
                          onClick={() => {
                            voiceEngine.setDialect(d.id);
                            sounds.speak(`已切换为${d.label}！`);
                          }}
                          className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                            isActive 
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow font-black' 
                              : theme === 'deep-green'
                              ? 'bg-[#0e3b28]/80 border-emerald-400/30 text-white hover:border-emerald-300'
                              : 'bg-[#0e3752]/80 border-cyan-400/30 text-white hover:border-cyan-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-base">{d.icon}</span>
                            <div className="truncate">
                              <div className={`font-bold text-xs truncate ${isActive ? 'text-slate-950' : 'text-white'}`}>{d.label}</div>
                              <div className={`text-[9px] truncate ${isActive ? 'text-slate-800' : 'text-white/60'}`}>{d.desc}</div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold shrink-0 ${isActive ? 'text-slate-950' : 'text-amber-300'}`}>{isActive ? '当前' : '选择'}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 1. ROUND SUMMARY FULL-SCREEN VIEW (局小结 - 全屏横屏战绩面板，永不遮挡裁剪) */}
        {gameState.phase === 'ROUND_SUMMARY' && (
          <div 
            className={`absolute inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 text-white select-none overflow-hidden animate-in fade-in zoom-in-98 duration-200 transition-colors duration-300 ${
              theme === 'deep-green'
                ? 'bg-gradient-to-b from-[#114732] via-[#165a3f] to-[#0e3b29]'
                : 'bg-gradient-to-b from-[#12476b] via-[#165680] to-[#0e3855]'
            }`}
          >
            {/* Top Header Bar */}
            <div className="flex items-center justify-between border-b border-emerald-400/30 pb-2 px-1 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-400 flex items-center justify-center text-emerald-200 shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide">
                      ♠️ 烟三 · 第 <span className="text-amber-300">{gameState.roundNumber}</span> 局战报小结
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      底分 {gameState.room.baseScore.toLocaleString()} 积分
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-300/90 font-medium">
                    小局不扣总积分，剩牌张数已折算累加！满 <span className="text-white font-black underline">100张</span> 触发终局大结算！
                  </div>
                </div>
              </div>

              {/* Winner Announcement Badge */}
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl px-3 py-1 text-right flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-300 leading-tight">本局头游获胜者</div>
                  <div className="text-xs sm:text-sm font-black text-amber-300 truncate">
                    {gameState.players[gameState.winnerIndex ?? 0]?.name}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Players Horizontal Settlement Cards Grid */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-2">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-6xl h-full items-stretch">
                {gameState.players.map((p, idx) => {
                  const isWinner = idx === gameState.winnerIndex;
                  const rawCount = p.cards ? p.cards.length : 0;
                  const eff = getEffectiveCards(rawCount);
                  const accCards = p.accumulatedCards || 0;
                  const progressPct = Math.min(100, (accCards / 100) * 100);
                  const isHuman = idx === 0;

                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between relative transition-all shadow-xl overflow-hidden ${
                        isWinner
                          ? 'bg-gradient-to-b from-amber-900/60 via-[#185e42] to-[#0f402c] border-amber-400/90 ring-2 ring-amber-400/40'
                          : isHuman
                          ? theme === 'deep-green'
                            ? 'bg-gradient-to-b from-[#185e42] to-[#0f402c] border-emerald-400/70'
                            : 'bg-gradient-to-b from-[#185c8a] to-[#0f3f5f] border-cyan-400/70'
                          : theme === 'deep-green'
                          ? 'bg-[#145339]/90 border-emerald-500/50'
                          : 'bg-[#144f75]/90 border-cyan-500/50'
                      }`}
                    >
                      {/* Top Rank / Seat Indicator */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-900/50 shrink-0">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base sm:text-lg">{p.avatar}</span>
                          <div className="truncate">
                            <div className="font-black text-xs text-white truncate flex items-center gap-1">
                              <span>{p.name}</span>
                              {isHuman && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                                  你
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-emerald-200/70 font-mono">
                              {['南家', '东家', '北家', '西家'][idx]}
                            </div>
                          </div>
                        </div>

                        {isWinner ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shrink-0 flex items-center gap-0.5">
                            <Crown className="w-3 h-3" />
                            <span>胜出 0张</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                              eff.multiplier >= 4
                                ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                                : eff.multiplier >= 2
                                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                                : 'bg-slate-800/80 text-slate-300'
                            }`}
                          >
                            {eff.multiplier > 1 ? `${eff.multiplier}倍关门` : '正常1倍'}
                          </span>
                        )}
                      </div>

                      {/* Middle Card: Round Result Status */}
                      <div className="my-auto py-1.5 text-center flex flex-col items-center justify-center gap-1">
                        {isWinner ? (
                          <>
                            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow-md">
                              <Trophy className="w-6 h-6" />
                            </div>
                            <div className="text-xs sm:text-sm font-black text-amber-300">
                              率先清空手牌！
                            </div>
                            <div className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 border border-emerald-500/40 rounded-lg px-2 py-0.5">
                              🚩 获第 {gameState.roundNumber + 1} 局首出权
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] text-slate-200">
                              本局剩牌: <strong className="text-white font-black text-sm">{rawCount}</strong> 张
                            </div>
                            <div className="text-xs font-black text-amber-300 bg-amber-950/60 border border-amber-500/40 rounded-xl px-2.5 py-1">
                              折算增加: <span className="text-base font-mono">+{eff.effective}</span> 张
                            </div>
                            <div className="text-[9px] text-amber-200/80">
                              {rawCount >= 13
                                ? '⚠️ 13张全关 (4倍惩罚)'
                                : rawCount >= 10
                                ? '⚠️ 10~12张 (3倍翻番)'
                                : rawCount >= 8
                                ? '⚠️ 8~9张 (2倍翻番)'
                                : '1~7张 (1倍计入)'}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Bottom Gauge: Progress towards 100 accumulated cards */}
                      <div className="pt-1.5 border-t border-emerald-900/50 shrink-0 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-slate-300">累计总剩牌:</span>
                          <span
                            className={`font-black text-xs ${
                              accCards >= 80
                                ? 'text-red-400'
                                : accCards >= 50
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {accCards} / 100 张
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#031d14] rounded-full h-2 overflow-hidden border border-emerald-900/80">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              accCards >= 80
                                ? 'bg-gradient-to-r from-orange-500 to-rose-600'
                                : accCards >= 50
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-slate-300">
                          <span>
                            {accCards >= 100
                              ? '🚨 已达100张大结算'
                              : `距结算还差 ${100 - accCards} 张`}
                          </span>
                          <span className="text-amber-300 font-mono font-bold">
                            结余: {p.score.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Rules Tip & Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-emerald-500/30 px-1 gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={onBackToLobby}
                  className={`px-3 py-2 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 border ${
                    theme === 'deep-green'
                      ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border-emerald-700/60'
                      : 'bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border-cyan-700/60'
                  }`}
                >
                  <Home className="w-3.5 h-3.5 text-amber-400" />
                  <span>返回大厅</span>
                </button>
                <div className="hidden sm:flex text-[11px] text-emerald-200/80 items-center gap-1">
                  <span>📢 下一局由【{gameState.players[gameState.winnerIndex ?? 0]?.name}】优先领牌首出！</span>
                </div>
              </div>

              {/* Big, High-Contrast Action Button - Always reachable */}
              <button
                onClick={onStartNewGame}
                className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl shadow-emerald-500/30 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-current text-slate-950" />
                <span>▶️ 继续下一局 (第 {gameState.roundNumber + 1} 局)</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. MATCH SETTLEMENT FULL-SCREEN VIEW (场大结算 - 满100张四舍五入大结算面板) */}
        {(gameState.phase === 'MATCH_SETTLEMENT' || gameState.phase === 'GAME_OVER') && (
          <div 
            className={`absolute inset-0 z-50 flex flex-col justify-between p-2 sm:p-3 md:p-4 text-white select-none overflow-hidden animate-in fade-in zoom-in-98 duration-200 transition-colors duration-300 ${
              theme === 'deep-green'
                ? 'bg-gradient-to-b from-[#0a2318] via-[#0e3b29] to-[#041910]'
                : 'bg-gradient-to-b from-[#082030] via-[#0d3650] to-[#041624]'
            }`}
          >
            {/* Top Header Bar */}
            <div className="flex items-center justify-between border-b border-amber-600/40 pb-2 px-1 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide">
                      🏆 第 <span className="text-amber-300">{gameState.matchNumber || 1}</span> 场终局大结算 (四舍五入到十位)
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      满 100 张触发
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-amber-300/90 font-medium">
                    采用正宗 <span className="text-white font-black underline">四舍五入法 (如 84➔80, 85➔90)</span> 两两对减公平结算！
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-amber-400 font-mono font-bold bg-amber-950/60 border border-amber-500/40 rounded-xl px-3 py-1">
                底分: {gameState.room.baseScore.toLocaleString()} 积分/分
              </div>
            </div>

            {/* 4 Players Final Match Settlement Table Grid */}
            <div className="flex-1 flex items-center justify-center min-h-0 py-2">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-6xl h-full items-stretch">
                {(() => {
                  const matchSettlements = calculateMatchSettlement(
                    gameState.players,
                    gameState.room.baseScore
                  );

                  // Sort to find champion
                  const sortedIndices = [...gameState.players.keys()].sort((a, b) => {
                    const stA = matchSettlements[a]?.coinChange || 0;
                    const stB = matchSettlements[b]?.coinChange || 0;
                    return stB - stA;
                  });

                  return gameState.players.map((p, idx) => {
                    const st = matchSettlements[idx];
                    const rankIndex = sortedIndices.indexOf(idx);
                    const rankMedals = ['🥇 冠军', '🥈 亚军', '🥉 季军', '🎖️ 殿军'];
                    const isChampion = rankIndex === 0;
                    const isHuman = idx === 0;

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border p-2.5 sm:p-3 flex flex-col justify-between relative transition-all shadow-xl overflow-hidden ${
                          isChampion
                            ? 'bg-gradient-to-b from-amber-950/80 via-slate-900 to-slate-950 border-amber-400/90 ring-2 ring-amber-400/40'
                            : st.coinChange > 0
                            ? 'bg-gradient-to-b from-emerald-950/40 to-slate-900 border-emerald-500/50'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        {/* Top Rank Badge */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/60 shrink-0">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-base sm:text-lg">{p.avatar}</span>
                            <div className="truncate">
                              <div className="font-black text-xs text-white truncate flex items-center gap-1">
                                <span>{p.name}</span>
                                {isHuman && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                                    你
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                {['南家', '东家', '北家', '西家'][idx]}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-black shadow shrink-0 ${
                              isChampion
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                                : rankIndex === 1
                                ? 'bg-slate-300 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {rankMedals[rankIndex]}
                          </span>
                        </div>

                        {/* Middle: Coin Delta & Rounded Calculation */}
                        <div className="my-auto py-2 text-center flex flex-col items-center justify-center gap-1">
                          <div className="text-[10px] text-slate-400 font-mono">
                            累计: <span className="text-amber-300 font-bold">{st.accumulatedCards}张</span> ➔ 四舍五入: <strong className="text-white font-black">{st.roundedCards}张</strong>
                          </div>

                          <div
                            className={`text-base sm:text-lg md:text-xl font-mono font-black ${
                              st.coinChange > 0
                                ? 'text-emerald-400'
                                : st.coinChange < 0
                                ? 'text-rose-400'
                                : 'text-amber-300'
                            }`}
                          >
                            {st.coinChange > 0 ? `+${st.coinChange.toLocaleString()}` : st.coinChange.toLocaleString()} 积分
                          </div>

                          <div className="text-[9px] text-slate-400 font-mono bg-black/40 border border-slate-800 rounded-lg px-2 py-1 w-full truncate">
                            公式: <code className="text-amber-300 font-bold">{st.formulaDesc}</code>
                          </div>
                        </div>

                        {/* Bottom Balance */}
                        <div className="pt-1.5 border-t border-slate-800/60 shrink-0 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-mono">结余积分:</span>
                          <span className="font-mono font-black text-amber-300">
                            {st.finalScore.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-amber-900/60 px-1 gap-2 shrink-0">
              <button
                onClick={onBackToLobby}
                className="px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                <span>返回大厅</span>
              </button>

              <button
                onClick={onStartNewMatch || onStartNewGame}
                className="px-6 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm md:text-base shadow-xl shadow-amber-500/40 cursor-pointer transition-all active:scale-95 flex items-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>🏆 开始新一场 (重置从♦2首出)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
