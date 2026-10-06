import React from 'react';
import { Volume2, VolumeX, RotateCcw, Flame, Bomb, Trophy } from 'lucide-react';
import { GameState } from '../types/game';

interface HeaderProps {
  gameState: GameState;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartNewGame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  gameState,
  soundEnabled,
  onToggleSound,
  onStartNewGame,
}) => {
  const human = gameState.players[0];

  return (
    <header className="bg-slate-950/95 border-b border-emerald-950/80 text-white sticky top-0 z-50 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3">
        {/* Brand & Room Info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-900/30 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-sm font-black tracking-tight">
              <span className="text-amber-400">斗</span>
              <span className="text-emerald-400">地</span>
              <span className="text-cyan-400">主</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight">
                欢乐斗地主
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">
                第 {gameState.roundNumber} 局
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
              <span>你的积分: <strong className="text-amber-400 font-mono">{human?.score ?? 1000}</strong></span>
              <span>•</span>
              <span>当前倍数: <strong className="text-emerald-400 font-mono">x{gameState.multiplier}</strong></span>
            </div>
          </div>
        </div>

        {/* Live Table Multiplier & Bombs Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>x{gameState.multiplier}</span>
          </div>

          {gameState.bombCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-red-300 font-bold text-xs">
              <Bomb className="w-3 h-3 text-red-400" />
              <span>{gameState.bombCount}</span>
            </div>
          )}

          {/* Audio toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? '点击静音' : '点击开启声音'}
            className={`p-2 rounded-xl border transition-all text-xs flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Restart / New Round */}
          <button
            onClick={onStartNewGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
            title="重新洗牌开局"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">新开一局</span>
          </button>
        </div>
      </div>
    </header>
  );
};
