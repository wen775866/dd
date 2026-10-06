/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
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

const PROFILE_STORAGE_KEY = 'qq_ddz_user_profile_v2';

// Opponent bot character pool
const BOT_CHARACTERS = [
  { name: '牌坛圣手·富贵', avatar: '🧔' },
  { name: '绝地反击·灵儿', avatar: '👧' },
  { name: '深谋远虑·诸葛', avatar: '🧙‍♂️' },
  { name: '炸弹狂魔·铁柱', avatar: '🤠' },
  { name: '常胜将军·子龙', avatar: '🤺' },
  { name: '天选之子·平安', avatar: '😎' },
  { name: '顺风翻盘·小鱼', avatar: '🐱' },
  { name: '神算妙手·半仙', avatar: '🧐' },
];

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Persistent User Profile (QQ Dou Dizhu profile)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {}
    }
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

  const handleUpdateProfile = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      } catch {}
    }
  }, []);

  // Current active room
  const [currentRoom, setCurrentRoom] = useState<RoomConfig>(QQ_ROOM_PRESETS[0]);

  // Create initial GameState
  const initGame = useCallback(
    (room: RoomConfig, prevPlayers?: Player[], round = 1): GameState => {
      const rawDeck = room.isNoShuffle ? createNoShuffleDeck() : shuffleDeck(createDeck());
      const p0Cards = sortCards(rawDeck.slice(0, 17));
      const p1Cards = sortCards(rawDeck.slice(17, 34));
      const p2Cards = sortCards(rawDeck.slice(34, 51));
      const bottomCards = sortCards(rawDeck.slice(51, 54));

      const p0Score = userProfile.coins;
      const p1Score = prevPlayers?.[1]?.score ?? room.baseScore * 50;
      const p2Score = prevPlayers?.[2]?.score ?? room.baseScore * 50;

      // Pick distinct bots if starting fresh
      let bot1 = { name: prevPlayers?.[1]?.name || '电脑(左)·智多星', avatar: prevPlayers?.[1]?.avatar || '🤖' };
      let bot2 = { name: prevPlayers?.[2]?.name || '电脑(右)·常胜客', avatar: prevPlayers?.[2]?.avatar || '🧐' };

      if (!prevPlayers) {
        const shuffledBots = [...BOT_CHARACTERS].sort(() => Math.random() - 0.5);
        bot1 = shuffledBots[0];
        bot2 = shuffledBots[1];
      }

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
          name: bot1.name,
          role: 'UNKNOWN',
          cards: p1Cards,
          isAI: true,
          score: p1Score,
          avatar: bot1.avatar,
        },
        {
          id: 'player-2',
          name: bot2.name,
          role: 'UNKNOWN',
          cards: p2Cards,
          isAI: true,
          score: p2Score,
          avatar: bot2.avatar,
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

  // Next round with same table
  const handleStartNewGame = () => {
    const nextRound = gameState.roundNumber + 1;
    const newGame = initGame(currentRoom, gameState.players, nextRound);
    setGameState(newGame);

    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Change table (换桌)
  const handleChangeTable = () => {
    const newGame = initGame(currentRoom, undefined, 1);
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

  // Sync human score back to userProfile & persist
  const handleUpdateGameState = (newState: GameState) => {
    setGameState(newState);
    if (newState.players[0]) {
      const isWon = newState.phase === 'GAME_OVER' && newState.winnerIndex === 0;
      const isLost = newState.phase === 'GAME_OVER' && newState.winnerIndex !== 0 && newState.winnerIndex !== null;

      const updatedProfile: UserProfile = {
        ...userProfile,
        coins: newState.players[0].score,
        wins: isWon ? userProfile.wins + 1 : userProfile.wins,
        losses: isLost ? userProfile.losses + 1 : userProfile.losses,
      };

      setUserProfile(updatedProfile);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updatedProfile));
        } catch {}
      }
    }
  };

  return (
    <LandscapeWrapper>
      {gameState.phase === 'LOBBY' ? (
        <QQLobby
          userProfile={userProfile}
          onUpdateProfile={handleUpdateProfile}
          onEnterRoom={handleEnterRoom}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      ) : (
        <TabletopGameView
          gameState={gameState}
          onUpdateState={handleUpdateGameState}
          onStartNewGame={handleStartNewGame}
          onChangeTable={handleChangeTable}
          onBackToLobby={handleBackToLobby}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}
    </LandscapeWrapper>
  );
}
