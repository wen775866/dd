/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { GameState, Player } from './types/game';
import { createDeck, shuffleDeck, sortCards } from './utils/doudizhuRules';
import { sounds } from './utils/audio';
import { Header, GameViewMode } from './components/Header';
import { TermuxTerminalView } from './components/TermuxTerminalView';
import { TabletopGameView } from './components/TabletopGameView';

export default function App() {
  const [viewMode, setViewMode] = useState<GameViewMode>('terminal');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Initialize fresh new game
  const initGame = useCallback((): GameState => {
    const deck = shuffleDeck(createDeck());
    const p0Cards = sortCards(deck.slice(0, 17));
    const p1Cards = sortCards(deck.slice(17, 34));
    const p2Cards = sortCards(deck.slice(34, 51));
    const bottomCards = sortCards(deck.slice(51, 54));

    const players: Player[] = [
      {
        id: 'player-0',
        name: '终端玩家(你)',
        role: 'UNKNOWN',
        cards: p0Cards,
        isAI: false,
        score: 1000,
        avatar: '',
      },
      {
        id: 'player-1',
        name: 'AI 极速小哥(左)',
        role: 'UNKNOWN',
        cards: p1Cards,
        isAI: true,
        score: 1000,
        avatar: '',
      },
      {
        id: 'player-2',
        name: 'AI 算牌大师(右)',
        role: 'UNKNOWN',
        cards: p2Cards,
        isAI: true,
        score: 1000,
        avatar: '',
      },
    ];

    sounds.playDeal();

    return {
      phase: 'BIDDING',
      players,
      currentPlayerIndex: 0,
      landlordIndex: 0,
      bottomCards,
      lastValidHand: null,
      passCount: 0,
      multiplier: 1,
      bombCount: 0,
      history: [],
      winnerIndex: null,
      roundNumber: 1,
    };
  }, []);

  const [gameState, setGameState] = useState<GameState>(initGame);

  const handleStartNewGame = () => {
    setGameState(initGame());
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onStartNewGame={handleStartNewGame}
      />

      {/* Main Game Screen */}
      <main className="flex-1 p-2 sm:p-5 flex flex-col items-center justify-center">
        {viewMode === 'terminal' ? (
          <TermuxTerminalView
            gameState={gameState}
            onUpdateState={setGameState}
            onStartNewGame={handleStartNewGame}
          />
        ) : (
          <TabletopGameView
            gameState={gameState}
            onUpdateState={setGameState}
            onStartNewGame={handleStartNewGame}
          />
        )}
      </main>

      {/* Clean Bottom Bar */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-2.5 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Go 斗地主 · Android Termux 终端原生移植版
          </span>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-400 font-mono">
              第 {gameState.roundNumber} 局 | 当前行动: {gameState.players[gameState.currentPlayerIndex]?.name}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
