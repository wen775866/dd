import React, { useState, useEffect } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import { SUIT_SYMBOLS, analyzeHand, canBeat, getHandDescription, sortCards } from '../utils/doudizhuRules';
import { aiChoosePlay, calculateBid } from '../utils/doudizhuAI';
import { sounds } from '../utils/audio';
import { Play, RotateCcw, Lightbulb, Bomb, Flame, Trophy, Crown, User, Bot, Sparkles, Check, ChevronUp } from 'lucide-react';

interface TabletopGameViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
}

export const TabletopGameView: React.FC<TabletopGameViewProps> = ({
  gameState,
  onUpdateState,
  onStartNewGame,
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [speechBubble, setSpeechBubble] = useState<{ [playerId: string]: string }>({});

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = !currentPlayer?.isAI && gameState.phase === 'PLAYING';
  const isBiddingHuman = !gameState.players[gameState.currentPlayerIndex]?.isAI && gameState.phase === 'BIDDING';

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

  const toggleSelectCard = (cardId: string) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  // Human play
  const handleHumanPlay = () => {
    if (!isHumanTurn) return;
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
      showBubble('player-0', '牌不够大，压不过！');
      return;
    }

    // Success play
    executePlay(0, cardsToPlay, hand);
    setSelectedCardIds([]);
  };

  // Human pass
  const handleHumanPass = () => {
    if (!isHumanTurn || !gameState.lastValidHand) return;
    sounds.playPass();
    executePass(0);
    setSelectedCardIds([]);
  };

  // Human smart hint
  const handleHumanHint = () => {
    if (!isHumanTurn) return;
    const human = gameState.players[0];
    const play = aiChoosePlay(human, human.cards, gameState.lastValidHand, gameState.players);
    if (play.length === 0) {
      showBubble('player-0', '要不起，请点不出~');
    } else {
      setSelectedCardIds(play.map(c => c.id));
    }
  };

  // Human bid
  const handleHumanBid = (score: number) => {
    if (!isBiddingHuman) return;
    sounds.playBid(score);
    showBubble('player-0', score === 0 ? '不叫' : `${score}分！`);

    const newPlayers = [...gameState.players];
    newPlayers[0] = { ...newPlayers[0], biddingScore: score };
    advanceBidding(newPlayers, 0, score);
  };

  // Core execution functions
  const executePlay = (playerIdx: number, cards: Card[], hand: CardHand) => {
    const isBomb = hand.type === 'BOMB';
    const isRocket = hand.type === 'ROCKET';
    if (isBomb || isRocket) {
      sounds.playBomb();
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

    // Check winner
    if (remainingCards.length === 0) {
      sounds.playWin();
      onUpdateState({
        ...gameState,
        players: newPlayers,
        phase: 'GAME_OVER',
        winnerIndex: playerIdx,
        multiplier: newMult,
        bombCount: newBombs,
      });
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

  const advanceBidding = (players: Player[], currentIdx: number, score: number) => {
    let maxBid = score;
    let landlordIdx = score > 0 ? currentIdx : -1;

    // Simulate bots
    for (let i = 1; i < 3; i++) {
      const bot = players[i];
      const botBid = calculateBid(bot.cards, maxBid);
      players[i] = { ...bot, biddingScore: botBid };
      showBubble(bot.id, botBid === 0 ? '不叫' : `${botBid}分！`);
      if (botBid > maxBid) {
        maxBid = botBid;
        landlordIdx = i;
      }
    }

    if (landlordIdx === -1) {
      landlordIdx = Math.floor(Math.random() * 3);
    }

    const landlord = players[landlordIdx];
    const updatedLandlordCards = sortCards([...landlord.cards, ...gameState.bottomCards]);
    players[landlordIdx] = {
      ...landlord,
      role: 'LANDLORD',
      cards: updatedLandlordCards,
    };

    for (let i = 0; i < 3; i++) {
      if (i !== landlordIdx) {
        players[i] = { ...players[i], role: 'FARMER' };
      }
    }

    showBubble(landlord.id, '我是地主，看我的！');

    onUpdateState({
      ...gameState,
      players,
      phase: 'PLAYING',
      landlordIndex: landlordIdx,
      currentPlayerIndex: landlordIdx,
      lastValidHand: null,
      passCount: 0,
      multiplier: Math.max(1, maxBid),
    });
  };

  // AI Turn handler with realistic human typing delay
  useEffect(() => {
    if (gameState.phase !== 'PLAYING') return;
    const curr = gameState.players[gameState.currentPlayerIndex];
    if (!curr || !curr.isAI) return;

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
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.currentPlayerIndex, gameState.lastValidHand]);

  const human = gameState.players[0];
  const botLeft = gameState.players[1];
  const botRight = gameState.players[2];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      {/* Tabletop Container */}
      <div className="relative rounded-2xl border-4 border-amber-950/80 bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 p-4 sm:p-6 shadow-2xl overflow-hidden min-h-[580px] flex flex-col justify-between">
        {/* Felt Texture subtle glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Top Info Bar: Bottom Cards & Multiplier */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-emerald-500/20">
          {/* Game Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>倍数: x{gameState.multiplier}</span>
            </div>
            {gameState.bombCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs">
                <Bomb className="w-3.5 h-3.5 text-red-400" />
                <span>炸弹: {gameState.bombCount}</span>
              </div>
            )}
            <div className="text-xs text-emerald-200/80 hidden sm:block">
              阶段:{' '}
              {gameState.phase === 'BIDDING'
                ? '叫地主阶段'
                : gameState.phase === 'PLAYING'
                ? '出牌对战'
                : '对局结算'}
            </div>
          </div>

          {/* Bottom Cards (底牌) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-200">底牌:</span>
            <div className="flex items-center gap-1.5">
              {gameState.bottomCards.map((card, i) => {
                const isRevealed = gameState.phase !== 'BIDDING';
                return (
                  <div
                    key={i}
                    className={`w-9 h-13 sm:w-11 sm:h-15 rounded-md border flex flex-col items-center justify-center font-bold shadow-md transition-all ${
                      isRevealed
                        ? 'bg-white text-slate-900 border-slate-300 scale-100'
                        : 'bg-emerald-800/80 border-emerald-600/60 scale-95'
                    }`}
                  >
                    {isRevealed ? (
                      <>
                        <span className={`text-xs font-black ${card.color === 'red' ? 'text-red-600' : 'text-slate-900'}`}>
                          {card.rank}
                        </span>
                        <span className={`text-[11px] ${card.color === 'red' ? 'text-red-600' : 'text-slate-700'}`}>
                          {SUIT_SYMBOLS[card.suit]}
                        </span>
                      </>
                    ) : (
                      <span className="text-emerald-400 text-xs font-mono">?</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Restart Button */}
          <button
            onClick={onStartNewGame}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-100 text-xs font-medium border border-emerald-600/40 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新发牌</span>
          </button>
        </div>

        {/* Center Arena: Left AI, Middle Play Zone, Right AI */}
        <div className="relative z-10 grid grid-cols-12 gap-2 items-center my-6">
          {/* Left Player (Bot 1) */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {/* Speech bubble */}
              {speechBubble[botLeft.id] && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-slate-300 animate-bounce">
                  {speechBubble[botLeft.id]}
                </div>
              )}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 transition-all ${
                  gameState.currentPlayerIndex === 1
                    ? 'border-amber-400 ring-4 ring-amber-400/30 scale-105'
                    : 'border-emerald-700 bg-slate-900/80'
                } ${botLeft.role === 'LANDLORD' ? 'bg-red-950/80' : 'bg-slate-900/80'}`}
              >
                {botLeft.role === 'LANDLORD' ? (
                  <Crown className="w-7 h-7 text-amber-400" />
                ) : (
                  <Bot className="w-7 h-7 text-emerald-400" />
                )}
              </div>
              {botLeft.role !== 'UNKNOWN' && (
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    botLeft.role === 'LANDLORD'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {botLeft.role === 'LANDLORD' ? '地主' : '农民'}
                </span>
              )}
            </div>

            <div className="text-center mt-2.5">
              <div className="text-xs font-bold text-slate-100">{botLeft.name}</div>
              <div className="text-[11px] text-emerald-300/80 font-mono">
                剩余 {botLeft.cards.length} 张
              </div>
            </div>

            {/* Back card fan representation */}
            <div className="flex -space-x-4 mt-1.5">
              {Array.from({ length: Math.min(6, botLeft.cards.length) }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-8 rounded bg-gradient-to-tr from-cyan-900 to-blue-800 border border-blue-400/40 shadow-sm"
                />
              ))}
            </div>
          </div>

          {/* Center Table Battle Zone */}
          <div className="col-span-6 flex flex-col items-center justify-center min-h-[140px] px-2">
            {gameState.lastValidHand ? (
              <div className="flex flex-col items-center gap-2">
                <div className="text-xs font-semibold text-amber-300/90 bg-black/40 px-3 py-1 rounded-full border border-amber-500/20">
                  {gameState.players.find(p => p.id === gameState.lastValidHand?.playerId)?.name} 打出 ·{' '}
                  {getHandDescription(gameState.lastValidHand.hand)}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {gameState.lastValidHand.hand.cards.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="w-11 h-16 sm:w-13 sm:h-18 rounded-lg bg-white border border-slate-300 shadow-xl flex flex-col items-center justify-between p-1 transition-transform animate-in fade-in zoom-in-95 duration-200"
                    >
                      <div className="w-full flex justify-between text-[11px] font-black">
                        <span className={c.color === 'red' ? 'text-red-600' : 'text-slate-900'}>
                          {c.rank}
                        </span>
                      </div>
                      <div className={`text-base ${c.color === 'red' ? 'text-red-600' : 'text-slate-800'}`}>
                        {SUIT_SYMBOLS[c.suit]}
                      </div>
                      <div className="w-full flex justify-end text-[10px] font-bold text-slate-400">
                        {c.displayRank}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-emerald-300/60 text-xs sm:text-sm border border-dashed border-emerald-600/40 px-6 py-4 rounded-xl">
                {gameState.phase === 'BIDDING'
                  ? '等待叫地主结束，底牌发放中...'
                  : '桌面当前无牌，请任意自由出牌'}
              </div>
            )}
          </div>

          {/* Right Player (Bot 2) */}
          <div className="col-span-3 flex flex-col items-center">
            <div className="relative">
              {speechBubble[botRight.id] && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-slate-300 animate-bounce">
                  {speechBubble[botRight.id]}
                </div>
              )}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg border-2 transition-all ${
                  gameState.currentPlayerIndex === 2
                    ? 'border-amber-400 ring-4 ring-amber-400/30 scale-105'
                    : 'border-emerald-700 bg-slate-900/80'
                } ${botRight.role === 'LANDLORD' ? 'bg-red-950/80' : 'bg-slate-900/80'}`}
              >
                {botRight.role === 'LANDLORD' ? (
                  <Crown className="w-7 h-7 text-amber-400" />
                ) : (
                  <Bot className="w-7 h-7 text-emerald-400" />
                )}
              </div>
              {botRight.role !== 'UNKNOWN' && (
                <span
                  className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    botRight.role === 'LANDLORD'
                      ? 'bg-red-600 text-white'
                      : 'bg-emerald-700 text-white'
                  }`}
                >
                  {botRight.role === 'LANDLORD' ? '地主' : '农民'}
                </span>
              )}
            </div>

            <div className="text-center mt-2.5">
              <div className="text-xs font-bold text-slate-100">{botRight.name}</div>
              <div className="text-[11px] text-emerald-300/80 font-mono">
                剩余 {botRight.cards.length} 张
              </div>
            </div>

            <div className="flex -space-x-4 mt-1.5">
              {Array.from({ length: Math.min(6, botRight.cards.length) }).map((_, i) => (
                <div
                  key={i}
                  className="w-5 h-8 rounded bg-gradient-to-tr from-cyan-900 to-blue-800 border border-blue-400/40 shadow-sm"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Human Player Section */}
        <div className="relative z-10 flex flex-col items-center gap-3 bg-black/50 backdrop-blur-md rounded-2xl p-4 border border-emerald-500/20">
          {/* Speech bubble for human */}
          {speechBubble['player-0'] && (
            <div className="bg-amber-400 text-slate-900 text-xs font-bold px-4 py-1 rounded-full shadow-lg border border-amber-300">
              {speechBubble['player-0']}
            </div>
          )}

          {/* Action Button Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {isBiddingHuman && (
              <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-amber-500/40">
                <span className="text-xs font-bold text-amber-300 px-2">请抢地主:</span>
                <button
                  onClick={() => handleHumanBid(0)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  不叫
                </button>
                <button
                  onClick={() => handleHumanBid(1)}
                  className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 text-xs font-semibold cursor-pointer border border-amber-700"
                >
                  1 分
                </button>
                <button
                  onClick={() => handleHumanBid(2)}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-amber-100 text-xs font-semibold cursor-pointer"
                >
                  2 分
                </button>
                <button
                  onClick={() => handleHumanBid(3)}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold shadow-lg shadow-amber-500/30 cursor-pointer"
                >
                  3 分 (必胜)
                </button>
              </div>
            )}

            {isHumanTurn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHumanHint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md cursor-pointer transition-all"
                >
                  <Lightbulb className="w-4 h-4 text-amber-300" />
                  提示
                </button>

                <button
                  onClick={handleHumanPass}
                  disabled={!gameState.lastValidHand}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    gameState.lastValidHand
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                      : 'bg-slate-800/40 text-slate-600 border border-slate-800/40 cursor-not-allowed'
                  }`}
                >
                  不出 (过)
                </button>

                <button
                  onClick={handleHumanPlay}
                  disabled={selectedCardIds.length === 0}
                  className={`flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer ${
                    selectedCardIds.length > 0
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-900/50 scale-105'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  出牌 ({selectedCardIds.length})
                </button>
              </div>
            )}

            {!isHumanTurn && gameState.phase === 'PLAYING' && (
              <div className="text-xs text-emerald-300/80 font-medium py-1 animate-pulse flex items-center gap-2">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span>等待 {currentPlayer?.name} 出牌中...</span>
              </div>
            )}
          </div>

          {/* Human Cards Hand Strip */}
          <div className="w-full flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto py-3 px-2">
            {human.cards.map(card => {
              const isSelected = selectedCardIds.includes(card.id);
              return (
                <button
                  key={card.id}
                  onClick={() => toggleSelectCard(card.id)}
                  className={`w-10 h-16 sm:w-14 sm:h-22 rounded-lg bg-white border flex flex-col justify-between p-1 sm:p-1.5 transition-all select-none cursor-pointer shrink-0 ${
                    isSelected
                      ? 'border-amber-400 ring-3 ring-amber-400 -translate-y-4 shadow-xl shadow-amber-500/30'
                      : 'border-slate-300 hover:-translate-y-1 shadow-md hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs sm:text-sm font-black ${card.color === 'red' ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.rank}
                    </span>
                  </div>

                  <div className={`text-center text-sm sm:text-xl font-bold ${card.color === 'red' ? 'text-red-600' : 'text-slate-800'}`}>
                    {SUIT_SYMBOLS[card.suit]}
                  </div>

                  <div className="flex items-center justify-end text-[9px] sm:text-[10px] font-bold text-slate-400">
                    {card.displayRank}
                  </div>
                </button>
              );
            })}
          </div>

          {/* User ID Tag */}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{human.name}</span>
            {human.role !== 'UNKNOWN' && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  human.role === 'LANDLORD' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }`}
              >
                {human.role === 'LANDLORD' ? '地主' : '农民'}
              </span>
            )}
            <span className="text-slate-400 text-[11px]">手牌: {human.cards.length} 张</span>
          </div>
        </div>

        {/* Victory Modal */}
        {gameState.phase === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/30">
                <Trophy className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">
                  {gameState.players[gameState.winnerIndex!]?.role === 'LANDLORD'
                    ? `🏆 地主 [${gameState.players[gameState.winnerIndex!]?.name}] 胜利！`
                    : '🎉 农民阵营获得胜利！'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  最终结算倍数: <span className="text-amber-400 font-bold">x{gameState.multiplier}</span> · 
                  打出炸弹数: <span className="text-red-400 font-bold">{gameState.bombCount}</span>
                </p>
              </div>

              <div className="w-full bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5 text-left">
                {gameState.players.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center text-slate-300">
                    <span className="font-medium">
                      {p.name} ({p.role === 'LANDLORD' ? '地主' : '农民'})
                    </span>
                    <span className="text-slate-400">剩余 {p.cards.length} 张牌</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onStartNewGame}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 cursor-pointer transition-all"
              >
                再来一局
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
