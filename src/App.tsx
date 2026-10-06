import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player, RoomConfig, UserProfile } from './types/game';
import {
  createDeck,
  shuffleDeck,
  sortCards,
} from './utils/chudadiRules';
import { sounds } from './utils/audio';
import { authStore, UserAccount } from './utils/authStore';
import { GameLobby, CHUDADI_ROOM_PRESETS } from './components/GameLobby';
import { TabletopGameView } from './components/TabletopGameView';
import { LandscapeWrapper } from './components/LandscapeWrapper';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal } from './components/AuthModal';
import { BotAdminModal } from './components/BotAdminModal';

const BOT_CHARACTERS = [
  { name: '西家·智多星', avatar: '🤖', position: 'left' as const },
  { name: '北家·雀圣霸主', avatar: '👑', position: 'top' as const },
  { name: '东家·常胜猫仙', avatar: '🐱', position: 'right' as const },
  { name: '西家·独孤求败', avatar: '🧙‍♂️', position: 'left' as const },
  { name: '北家·神算巧手', avatar: '🧐', position: 'top' as const },
  { name: '东家·翻盘小狂人', avatar: '🤠', position: 'right' as const },
];

export default function App() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Active User session from authStore
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() =>
    authStore.getActiveUser()
  );
  const [userProfile, setUserProfile] = useState<UserProfile>(() =>
    authStore.getActiveProfile()
  );

  // Modal visibility states
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Subscribe to authStore changes
  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setCurrentUser(authStore.getActiveUser());
      setUserProfile(authStore.getActiveProfile());
    });
    return unsubscribe;
  }, []);

  const handleUpdateCoins = useCallback(
    (newCoins: number) => {
      authStore.syncUserCoins(newCoins);
      setUserProfile(prev => ({ ...prev, coins: newCoins }));
    },
    []
  );

  const handleOpenAuth = useCallback((tab: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthModalTab(tab);
    setShowAuthModal(true);
  }, []);

  const handleOpenAdmin = useCallback(() => {
    setShowAdminModal(true);
  }, []);

  const handleLogout = useCallback(() => {
    authStore.logout();
    sounds.playClick();
  }, []);

  // Current active room
  const [currentRoom, setCurrentRoom] = useState<RoomConfig>(CHUDADI_ROOM_PRESETS[0]);

  // Create initial GameState for Big Two (锄大地)
  const initGame = useCallback(
    (room: RoomConfig, prevPlayers?: Player[], round = 1): GameState => {
      const rawDeck = shuffleDeck(createDeck());
      const p0Cards = sortCards(rawDeck.slice(0, 13));
      const p1Cards = sortCards(rawDeck.slice(13, 26));
      const p2Cards = sortCards(rawDeck.slice(26, 39));
      const p3Cards = sortCards(rawDeck.slice(39, 52));

      const p0Score = userProfile.coins;
      const p1Score = prevPlayers?.[1]?.score ?? room.baseScore * 50;
      const p2Score = prevPlayers?.[2]?.score ?? room.baseScore * 50;
      const p3Score = prevPlayers?.[3]?.score ?? room.baseScore * 50;

      let bot1 = { name: prevPlayers?.[1]?.name || '西家·智多星', avatar: prevPlayers?.[1]?.avatar || '🤖' };
      let bot2 = { name: prevPlayers?.[2]?.name || '北家·雀圣霸主', avatar: prevPlayers?.[2]?.avatar || '👑' };
      let bot3 = { name: prevPlayers?.[3]?.name || '东家·常胜猫仙', avatar: prevPlayers?.[3]?.avatar || '🐱' };

      if (!prevPlayers) {
        const shuffledBots = [...BOT_CHARACTERS].sort(() => Math.random() - 0.5);
        bot1 = shuffledBots[0];
        bot2 = shuffledBots[1];
        bot3 = shuffledBots[2];
      }

      const players: Player[] = [
        {
          id: 'player-0',
          name: userProfile.nickname,
          cards: p0Cards,
          isAI: false,
          score: p0Score,
          avatar: userProfile.avatar,
          position: 'bottom',
        },
        {
          id: 'player-1',
          name: bot1.name,
          cards: p1Cards,
          isAI: true,
          score: p1Score,
          avatar: bot1.avatar,
          position: 'left',
        },
        {
          id: 'player-2',
          name: bot2.name,
          cards: p2Cards,
          isAI: true,
          score: p2Score,
          avatar: bot2.avatar,
          position: 'top',
        },
        {
          id: 'player-3',
          name: bot3.name,
          cards: p3Cards,
          isAI: true,
          score: p3Score,
          avatar: bot3.avatar,
          position: 'right',
        },
      ];

      // Find player holding diamond-3 (3♦) to lead the first trick
      const starterCardId = 'diamond-3';
      let starterPlayerIdx = 0;

      for (let i = 0; i < 4; i++) {
        if (players[i].cards.some(c => c.id === starterCardId)) {
          starterPlayerIdx = i;
          break;
        }
      }

      return {
        phase: 'PLAYING',
        room,
        players,
        currentPlayerIndex: starterPlayerIdx,
        starterCardId,
        isFirstTrick: true,
        lastValidHand: null,
        passCount: 0,
        trickLeaderIndex: starterPlayerIdx,
        history: [],
        winnerIndex: null,
        roundNumber: round,
        multiplier: 1,
      };
    },
    [userProfile]
  );

  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: 'LOBBY',
    room: CHUDADI_ROOM_PRESETS[0],
    players: [],
    currentPlayerIndex: 0,
    starterCardId: 'diamond-3',
    isFirstTrick: true,
    lastValidHand: null,
    passCount: 0,
    trickLeaderIndex: 0,
    history: [],
    winnerIndex: null,
    roundNumber: 1,
    multiplier: 1,
  }));

  // Enter room from lobby
  const handleSelectRoom = (room: RoomConfig) => {
    setCurrentRoom(room);
    const newGame = initGame(room, undefined, 1);
    setGameState(newGame);

    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Start new round
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

  // Sync human score back to userProfile
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
      authStore.syncUserCoins(newState.players[0].score, isWon, isLost);
    }
  };

  return (
    <LandscapeWrapper>
      {gameState.phase === 'LOBBY' ? (
        <GameLobby
          userProfile={userProfile}
          currentUser={currentUser}
          onSelectRoom={handleSelectRoom}
          onUpdateCoins={handleUpdateCoins}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
          onOpenAuth={handleOpenAuth}
          onOpenAdmin={handleOpenAdmin}
          onLogout={handleLogout}
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

      {/* Auth Modal (Login / TG Authorized Registration) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalTab}
        onSuccess={user => {
          sounds.playCoins();
          setShowAuthModal(false);
        }}
      />

      {/* Telegram Bot Admin Management Modal */}
      <BotAdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentUser={currentUser}
      />

      <OfflineIndicator />
    </LandscapeWrapper>
  );
}
