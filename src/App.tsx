/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { GameState, Player, RoomConfig, UserProfile } from './types/game';
import {
  createDeck,
  createNoShuffleDeck,
  shuffleDeck,
  sortCards,
} from './utils/doudizhuRules';
import { sounds } from './utils/audio';
import { QQLobby, QQ_ROOM_PRESETS } from './components/QQLobby';
import { TabletopGameView } from './components/TabletopGameView';
import { LandscapeWrapper } from './components/LandscapeWrapper';

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Persistent User Profile (QQ Dou Dizhu profile)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return {
      nickname: 'QQ雀圣·大司马',
      avatar: '🤠',
      coins: 18888,
      diamonds: 168,
      wins: 28,
      losses: 12,
      title: '高阶雀仙',
      hasCheckedInToday: false,
    };
  });

  // Current active room
  const [currentRoom, setCurrentRoom] = useState<RoomConfig>(QQ_ROOM_PRESETS[0]);

  // Create initial GameState
  const initGame = useCallback(
    (room: RoomConfig, prevPlayers?: Player[], round = 1): GameState => {
      // Use no-shuffle deck if selected
      const rawDeck = room.isNoShuffle ? createNoShuffleDeck() : shuffleDeck(createDeck());
      const p0Cards = sortCards(rawDeck.slice(0, 17));
      const p1Cards = sortCards(rawDeck.slice(17, 34));
      const p2Cards = sortCards(rawDeck.slice(34, 51));
      const bottomCards = sortCards(rawDeck.slice(51, 54));

      const p0Score = userProfile.coins;
      const p1Score = prevPlayers?.[1]?.score ?? room.baseScore * 50;
      const p2Score = prevPlayers?.[2]?.score ?? room.baseScore * 50;

      const players: Player[] = [
        {
          id: 'player-0',
          name: userProfile.nickname,
          role: 'UNKNOWN',
          cards: p0Cards,
          isAI: false,
          score: p0Score,
          avatar: userProfile.avatar,
        },
        {
          id: 'player-1',
          name: '电脑(左)·智多星',
          role: 'UNKNOWN',
          cards: p1Cards,
          isAI: true,
          score: p1Score,
          avatar: '🤖',
        },
        {
          id: 'player-2',
          name: '电脑(右)·常胜客',
          role: 'UNKNOWN',
          cards: p2Cards,
          isAI: true,
          score: p2Score,
          avatar: '🧐',
        },
      ];

      // Random first caller
      const firstCaller = Math.floor(Math.random() * 3);

      return {
        phase: 'CALL_LANDLORD',
        room,
        players,
        currentPlayerIndex: firstCaller,
        firstCallerIndex: firstCaller,
        landlordIndex: -1,
        currentRobberIndex: -1,
        bottomCards,
        lastValidHand: null,
        passCount: 0,
        multiplier: 1,
        bombCount: 0,
        isSpring: false,
        isAntiSpring: false,
        history: [],
        winnerIndex: null,
        roundNumber: round,
      };
    },
    [userProfile]
  );

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: 'LOBBY',
    room: QQ_ROOM_PRESETS[0],
    players: [],
    currentPlayerIndex: 0,
    firstCallerIndex: 0,
    landlordIndex: -1,
    currentRobberIndex: -1,
    bottomCards: [],
    lastValidHand: null,
    passCount: 0,
    multiplier: 1,
    bombCount: 0,
    isSpring: false,
    isAntiSpring: false,
    history: [],
    winnerIndex: null,
    roundNumber: 1,
  }));

  // Enter room from lobby
  const handleEnterRoom = (room: RoomConfig) => {
    setCurrentRoom(room);
    const newGame = initGame(room, undefined, 1);
    setGameState(newGame);

    // Rapid deal sounds
    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Next round
  const handleStartNewGame = () => {
    const nextRound = gameState.roundNumber + 1;
    const newGame = initGame(currentRoom, gameState.players, nextRound);
    setGameState(newGame);

    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Return to Lobby
  const handleBackToLobby = () => {
    setGameState(prev => ({
      ...prev,
      phase: 'LOBBY',
    }));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
  };

  // Fullscreen trigger
  const handleToggleFullscreen = () => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        if ('orientation' in screen && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  // Sync human score back to userProfile
  const handleUpdateGameState = (newState: GameState) => {
    setGameState(newState);
    if (newState.players[0]) {
      setUserProfile(prev => ({
        ...prev,
        coins: newState.players[0].score,
        wins:
          newState.phase === 'GAME_OVER' && newState.winnerIndex === 0
            ? prev.wins + 1
            : prev.wins,
        losses:
          newState.phase === 'GAME_OVER' &&
          newState.winnerIndex !== 0 &&
          newState.winnerIndex !== null
            ? prev.losses + 1
            : prev.losses,
      }));
    }
  };

  return (
    <LandscapeWrapper>
      {gameState.phase === 'LOBBY' ? (
        <QQLobby
          userProfile={userProfile}
          onUpdateProfile={setUserProfile}
          onEnterRoom={handleEnterRoom}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onToggleFullscreen={handleToggleFullscreen}
        />
      ) : (
        <TabletopGameView
          gameState={gameState}
          onUpdateState={handleUpdateGameState}
          onStartNewGame={handleStartNewGame}
          onBackToLobby={handleBackToLobby}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}
    </LandscapeWrapper>
  );
}
