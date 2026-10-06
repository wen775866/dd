import React from 'react';
import { Terminal, LayoutGrid, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export type GameViewMode = 'terminal' | 'tabletop';

interface HeaderProps {
  viewMode: GameViewMode;
  onViewModeChange: (mode: GameViewMode) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onStartNewGame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  soundEnabled,
  onToggleSound,
  onStartNewGame,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-emerald-600 to-cyan-500 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-lg font-black tracking-tighter">
              <span className="text-amber-400">斗</span>
              <span className="text-emerald-400">地</span>
              <span className="text-cyan-400">主</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-slate-100 flex items-center gap-1.5">
                Go 斗地主
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Termux
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              纯 Go 语言 ANSI 终端引擎 · 经典三人对局 · 智能 AI 陪练
            </p>
          </div>
        </div>

        {/* View Mode Switcher (Terminal vs Tabletop) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onViewModeChange('terminal')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              viewMode === 'terminal'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Termux 终端模式</span>
          </button>

          <button
            onClick={() => onViewModeChange('tabletop')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              viewMode === 'tabletop'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>经典牌桌模式</span>
          </button>
        </div>

        {/* Quick controls: Sound & Restart */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? '音效已开启' : '音效已静音'}
            className={`p-2 rounded-xl border transition-all text-xs flex items-center justify-center cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onStartNewGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-all active:scale-95"
            title="重新洗牌发牌"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">新开一局</span>
          </button>
        </div>
      </div>
    </header>
  );
};
