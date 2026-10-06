import React, { useState, useEffect, useRef } from 'react';
import { GameState, Card, CardHand, Player } from '../types/game';
import { SUIT_SYMBOLS, analyzeHand, canBeat, getHandDescription, sortCards } from '../utils/doudizhuRules';
import { aiChoosePlay, calculateBid } from '../utils/doudizhuAI';
import { sounds } from '../utils/audio';
import { SvgCard } from './SvgCard';
import { Play, RotateCcw, Lightbulb, CornerDownLeft, Sparkles, Terminal as TermIcon, ShieldAlert, Cpu } from 'lucide-react';

interface TermuxTerminalViewProps {
  gameState: GameState;
  onUpdateState: (newState: GameState) => void;
  onStartNewGame: () => void;
}

export const TermuxTerminalView: React.FC<TermuxTerminalViewProps> = ({
  gameState,
  onUpdateState,
  onStartNewGame,
}) => {
  const [terminalTheme, setTerminalTheme] = useState<'termux' | 'matrix' | 'amber'>('termux');
  const [inputVal, setInputVal] = useState<string>('');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal log
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs, gameState.history]);

  // Terminal welcome message
  useEffect(() => {
    setTerminalLogs([
      'Welcome to Termux!',
      'Working directory: /data/data/com.termux/files/home',
      'Architecture: aarch64 (Android Linux)',
      'u0_a245@localhost ~ $ go version',
      'go version go1.22.4 linux/arm64',
      'u0_a245@localhost ~ $ ./doudizhu',
      '╔════════════════════════════════════════════════════════════╗',
      '║         ♠ ♥ ♣ ♦  Termux 极简 Go 语言斗地主  ♦ ♣ ♥ ♠         ║',
      '╚════════════════════════════════════════════════════════════╝',
      '已为您发牌，输入卡牌编号(如 1 2 3)出牌，输入 p 过牌，输入 h 提示',
    ]);
  }, []);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isHumanTurn = !currentPlayer.isAI && gameState.phase === 'PLAYING';
  const isBiddingHuman = !gameState.players[gameState.currentPlayerIndex]?.isAI && gameState.phase === 'BIDDING';

  // Toggle selection by card index (1-based)
  const toggleSelectCard = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index].sort((a, b) => a - b)
    );
  };

  // Submit human play via selected cards or raw text
  const handleHumanPlay = (indicesToPlay?: number[]) => {
    if (!isHumanTurn) return;
    const human = gameState.players[0];
    const targetIndices = indicesToPlay || selectedIndices;

    if (targetIndices.length === 0) {
      appendLog('[系统] 请选择要出的牌！');
      return;
    }

    const cardsToPlay = targetIndices
      .map(i => human.cards[i - 1])
      .filter(Boolean);

    const hand = analyzeHand(cardsToPlay);
    if (!hand) {
      sounds.playPass();
      appendLog('[规则错误] 所选卡牌不符合斗地主任何牌型！');
      return;
    }

    if (gameState.lastValidHand && !canBeat(gameState.lastValidHand.hand, hand)) {
      sounds.playPass();
      appendLog('[规则错误] 所出的牌无法压过上家的牌！');
      return;
    }

    // Success play
    executePlay(0, cardsToPlay, hand);
    setSelectedIndices([]);
    setInputVal('');
  };

  // Human passes
  const handleHumanPass = () => {
    if (!isHumanTurn) return;
    if (!gameState.lastValidHand) {
      appendLog('[规则错误] 自由出牌回合必须出牌，不能过牌！');
      return;
    }
    sounds.playPass();
    executePass(0);
    setSelectedIndices([]);
    setInputVal('');
  };

  // Smart hint for human
  const handleHumanHint = () => {
    if (!isHumanTurn) return;
    const human = gameState.players[0];
    const play = aiChoosePlay(
      human,
      human.cards,
      gameState.lastValidHand,
      gameState.players
    );

    if (play.length === 0) {
      appendLog('[提示] 没有能压过上家的牌，建议输入 p 过牌。');
    } else {
      // Find indices
      const indices: number[] = [];
      const used = new Set<string>();
      play.forEach(c => {
        const idx = human.cards.findIndex((hc, i) => !used.has(i.toString()) && hc.id === c.id);
        if (idx !== -1) {
          indices.push(idx + 1);
          used.add(idx.toString());
        }
      });
      setSelectedIndices(indices);
      const hand = analyzeHand(play);
      appendLog(`[提示] 推荐出牌: ${getHandDescription(hand!)} (编号: ${indices.join(' ')})`);
    }
  };

  // Human bids
  const handleHumanBid = (score: number) => {
    if (!isBiddingHuman) return;
    sounds.playBid(score);
    appendLog(`[叫地主] 你选择了叫: ${score === 0 ? '不叫' : score + '分'}`);

    const newPlayers = [...gameState.players];
    newPlayers[0] = { ...newPlayers[0], biddingScore: score };

    // Advance bidding or decide landlord
    advanceBidding(newPlayers, 0, score);
  };

  // Parse terminal command string
  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    appendLog(`u0_a245@localhost ~ $ ${cmd}`);

    if (gameState.phase === 'BIDDING') {
      const score = parseInt(cmd);
      if (!isNaN(score) && score >= 0 && score <= 3) {
        handleHumanBid(score);
      } else {
        appendLog('[输入错误] 叫分请输入 0 (不叫), 1, 2, 3');
      }
      setInputVal('');
      return;
    }

    if (cmd.toLowerCase() === 'p' || cmd.toLowerCase() === 'pass' || cmd === '过') {
      handleHumanPass();
      return;
    }

    if (cmd.toLowerCase() === 'h' || cmd.toLowerCase() === 'hint' || cmd === '提示') {
      handleHumanHint();
      return;
    }

    if (cmd.toLowerCase() === 'clear') {
      setTerminalLogs([]);
      setInputVal('');
      return;
    }

    if (cmd.toLowerCase() === 'restart' || cmd === 'r') {
      onStartNewGame();
      setInputVal('');
      return;
    }

    // Try parsing indices (e.g. "1 2" or "3 4 5 6 7")
    const parts = cmd.split(/[\s,]+/);
    const indices: number[] = [];
    let allNumbers = true;
    for (const p of parts) {
      const num = parseInt(p);
      if (isNaN(num)) {
        allNumbers = false;
        break;
      }
      indices.push(num);
    }

    if (allNumbers && indices.length > 0) {
      handleHumanPlay(indices);
      return;
    }

    appendLog(`[未知命令] 请输入卡牌编号 (如 1 2)，或 p(过牌)，h(提示)，r(重开)`);
    setInputVal('');
  };

  const appendLog = (msg: string) => {
    setTerminalLogs(prev => [...prev.slice(-80), msg]);
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
    } else if (isRocket) {
      newMult *= 4;
      newBombs += 1;
    }

    appendLog(
      `[出牌] ${player.name} (${player.role === 'LANDLORD' ? '地主' : '农民'}) 打出: ${getHandDescription(
        hand
      )} (${cards.map(c => c.rank).join(' ')})`
    );

    // Check winner
    if (remainingCards.length === 0) {
      sounds.playWin();
      appendLog(
        `🏆 【对局结束】 ${player.name} 牌已出完！${
          player.role === 'LANDLORD' ? '地主胜利！' : '农民阵营胜利！'
        }`
      );
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
    appendLog(`[过牌] ${player.name} 选择了 不要 (过)`);

    const newPassCount = gameState.passCount + 1;
    let nextLastValid = gameState.lastValidHand;
    if (newPassCount >= 2) {
      nextLastValid = null; // Reset to free turn
      appendLog(`[回合重置] 轮到新的一轮自由出牌！`);
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
    // Check if next players are bots or all finished
    let maxBid = score;
    let landlordIdx = score > 0 ? currentIdx : -1;

    // Simulate AI bidding
    for (let i = 1; i < 3; i++) {
      const bot = players[i];
      const botBid = calculateBid(bot.cards, maxBid);
      players[i] = { ...bot, biddingScore: botBid };
      appendLog(`[叫地主] ${bot.name} 叫了: ${botBid === 0 ? '不叫' : botBid + '分'}`);
      if (botBid > maxBid) {
        maxBid = botBid;
        landlordIdx = i;
      }
    }

    if (landlordIdx === -1) {
      landlordIdx = Math.floor(Math.random() * 3);
      appendLog(`[叫地主] 所有人均未叫分，系统随机指定 ${players[landlordIdx].name} 为地主！`);
    } else {
      appendLog(`[叫地主] 最终地主确认为: ${players[landlordIdx].name} (叫分 ${maxBid}分)`);
    }

    // Award bottom cards to landlord
    const landlord = players[landlordIdx];
    const updatedLandlordCards = sortCards([...landlord.cards, ...gameState.bottomCards]);
    players[landlordIdx] = {
      ...landlord,
      role: 'LANDLORD',
      cards: updatedLandlordCards,
    };

    // Other two are farmers
    for (let i = 0; i < 3; i++) {
      if (i !== landlordIdx) {
        players[i] = { ...players[i], role: 'FARMER' };
      }
    }

    appendLog(`[底牌亮明] ${gameState.bottomCards.map(c => c.rank).join(' ')} 已加入地主手牌`);
    appendLog(`[游戏开始] 地主 ${players[landlordIdx].name} 先手出牌！`);

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

  // Terminal Theme Colors
  const themeClasses = {
    termux: 'bg-black text-emerald-400 font-mono',
    matrix: 'bg-slate-950 text-green-500 font-mono',
    amber: 'bg-stone-950 text-amber-400 font-mono',
  }[terminalTheme];

  const human = gameState.players[0];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4">
      {/* Termux Terminal Window */}
      <div className="rounded-xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden flex flex-col">
        {/* Termux Mobile App Window Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-1.5 ml-2 font-mono text-slate-300">
              <TermIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold">Termux (ARM64) · ~/termux-doudizhu/doudizhu</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 hidden sm:inline">倍数: x{gameState.multiplier} | 炸弹: {gameState.bombCount}</span>
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded border border-slate-700 text-[10px]">
              <button
                onClick={() => setTerminalTheme('termux')}
                className={`px-1.5 py-0.5 rounded ${terminalTheme === 'termux' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
              >
                Termux
              </button>
              <button
                onClick={() => setTerminalTheme('matrix')}
                className={`px-1.5 py-0.5 rounded ${terminalTheme === 'matrix' ? 'bg-green-600 text-white' : 'text-slate-400'}`}
              >
                Matrix
              </button>
              <button
                onClick={() => setTerminalTheme('amber')}
                className={`px-1.5 py-0.5 rounded ${terminalTheme === 'amber' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
              >
                Amber
              </button>
            </div>
          </div>
        </div>

        {/* Live Terminal Screen Output */}
        <div className={`p-4 sm:p-5 h-[340px] sm:h-[400px] overflow-y-auto ${themeClasses} text-xs sm:text-sm leading-relaxed space-y-1 select-text`}>
          {terminalLogs.map((log, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {log}
            </div>
          ))}

          {/* Current Table State ASCII block */}
          {gameState.phase === 'PLAYING' && (
            <div className="my-3 p-2.5 rounded bg-slate-900/50 border border-slate-800 text-slate-200">
              <div className="text-yellow-400 font-bold mb-1">
                [当前战局] 地主: {gameState.players[gameState.landlordIndex]?.name || '未定'} | 当前行动: {currentPlayer?.name}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs py-1 text-slate-300">
                {gameState.players.map((p, idx) => (
                  <div key={p.id} className={`${idx === gameState.currentPlayerIndex ? 'text-emerald-400 font-bold' : ''}`}>
                    {idx === gameState.currentPlayerIndex ? '▶ ' : '  '}
                    {p.name} ({p.role === 'LANDLORD' ? '地主' : '农民'}): {p.cards.length} 张
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800 mt-1.5 pt-1 text-xs">
                桌面牌面:{' '}
                {gameState.lastValidHand ? (
                  <span className="text-cyan-300 font-semibold">
                    {getHandDescription(gameState.lastValidHand.hand)} (
                    {gameState.lastValidHand.hand.cards.map(c => `${SUIT_SYMBOLS[c.suit]}${c.rank}`).join(' ')}
                    )
                  </span>
                ) : (
                  <span className="text-emerald-400">自由出牌 (无压牌要求)</span>
                )}
              </div>
            </div>
          )}

          {/* Interactive cursor */}
          <div className="flex items-center gap-1.5 text-slate-400 pt-1">
            <span className="text-emerald-400 font-bold">u0_a245@localhost ~ $</span>
            <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse" />
          </div>
          <div ref={terminalEndRef} />
        </div>

        {/* Human Interactive Cards Dock */}
        <div className="bg-slate-900/90 border-t border-slate-800 p-3 sm:p-4 flex flex-col gap-3">
          {/* Header Status & Turn indicator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">你的手牌 ({human.cards.length}张):</span>
              {human.role !== 'UNKNOWN' && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${human.role === 'LANDLORD' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                  {human.role === 'LANDLORD' ? '👑 地主' : '🌾 农民'}
                </span>
              )}
            </div>

            {/* Bidding buttons */}
            {isBiddingHuman && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-amber-400 font-medium mr-1">轮到你叫地主:</span>
                <button
                  onClick={() => handleHumanBid(0)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                >
                  不叫 (0分)
                </button>
                <button
                  onClick={() => handleHumanBid(1)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-900/50 hover:bg-amber-800/60 text-amber-200 border border-amber-700 cursor-pointer"
                >
                  1分
                </button>
                <button
                  onClick={() => handleHumanBid(2)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-800 hover:bg-amber-700 text-amber-100 border border-amber-600 cursor-pointer"
                >
                  2分
                </button>
                <button
                  onClick={() => handleHumanBid(3)}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer shadow"
                >
                  3分 (必抢)
                </button>
              </div>
            )}

            {/* In-game quick action buttons */}
            {isHumanTurn && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleHumanHint}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium cursor-pointer transition-all"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
                  提示 (h)
                </button>
                <button
                  onClick={handleHumanPass}
                  disabled={!gameState.lastValidHand}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    gameState.lastValidHand
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer'
                      : 'bg-slate-800/40 text-slate-600 cursor-not-allowed border border-slate-800'
                  }`}
                >
                  不要 / 过 (p)
                </button>
                <button
                  onClick={() => handleHumanPlay()}
                  disabled={selectedIndices.length === 0}
                  className={`flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                    selectedIndices.length > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-emerald-900/40'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  出牌 ({selectedIndices.length})
                </button>
              </div>
            )}

            {!isHumanTurn && gameState.phase === 'PLAYING' && (
              <div className="text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentPlayer?.name} 正在思考中...</span>
              </div>
            )}

            {gameState.phase === 'GAME_OVER' && (
              <button
                onClick={onStartNewGame}
                className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                再来一局
              </button>
            )}
          </div>

          {/* Touch-Friendly Card Strip (With Index Numbers for Termux keyboard typing) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-2">
            {human.cards.map((card, idx) => {
              const cardNum = idx + 1;
              const isSelected = selectedIndices.includes(cardNum);
              return (
                <SvgCard
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  onClick={() => toggleSelectCard(cardNum)}
                  size="sm"
                  badgeIndex={cardNum}
                  className="shrink-0"
                />
              );
            })}
          </div>

          {/* Virtual Termux Extra-Keys toolbar (exact same as ~/.termux/termux.properties extra-keys) */}
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 font-mono mr-1">Termux 快捷按键:</span>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'p (过)', 'h (提示)', 'q (退出)'].map(keyLabel => {
              const keyVal = keyLabel.split(' ')[0];
              return (
                <button
                  key={keyLabel}
                  onClick={() => {
                    if (keyVal === 'p') handleHumanPass();
                    else if (keyVal === 'h') handleHumanHint();
                    else if (keyVal === 'q') appendLog('[系统] 按退出键');
                    else {
                      const n = parseInt(keyVal);
                      if (n <= human.cards.length) toggleSelectCard(n);
                    }
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-[11px] font-mono cursor-pointer transition-colors"
                >
                  {keyLabel}
                </button>
              );
            })}
          </div>

          {/* Real Input Line (Supports typing numbers or commands) */}
          <form onSubmit={handleCommandSubmit} className="flex items-center gap-2 mt-1">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono text-xs">
                $
              </span>
              <input
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="输入牌号(如 1 2 3) 或 p(过牌) / h(提示) / clear"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-3 py-1.5 text-xs font-mono text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer transition-all"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>执行</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
