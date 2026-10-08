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
import { ThemeProvider } from './utils/themeContext';

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
    (
      room: RoomConfig,
      prevPlayers?: Player[],
      round = 1,
      overrideBots?: { name: string; avatar: string }[],
      lastWinnerIdx?: number | null,
      matchNum = 1
    ): GameState => {
      const rawDeck = shuffleDeck(createDeck());
      const p0Cards = sortCards(rawDeck.slice(0, 13));
      const p1Cards = sortCards(rawDeck.slice(13, 26));
      const p2Cards = sortCards(rawDeck.slice(26, 39));
      const p3Cards = sortCards(rawDeck.slice(39, 52));

      const p0Score = userProfile.coins;
      const p1Score = prevPlayers?.[1]?.score ?? room.baseScore * 50;
      const p2Score = prevPlayers?.[2]?.score ?? room.baseScore * 50;
      const p3Score = prevPlayers?.[3]?.score ?? room.baseScore * 50;

      let bot1 = overrideBots?.[0] || { name: prevPlayers?.[1]?.name || '东家·常胜猫仙', avatar: prevPlayers?.[1]?.avatar || '🐱' };
      let bot2 = overrideBots?.[1] || { name: prevPlayers?.[2]?.name || '北家·雀圣霸主', avatar: prevPlayers?.[2]?.avatar || '👑' };
      let bot3 = overrideBots?.[2] || { name: prevPlayers?.[3]?.name || '西家·智多星', avatar: prevPlayers?.[3]?.avatar || '🤖' };

      if (!prevPlayers && !overrideBots) {
        const shuffledBots = [...BOT_CHARACTERS].sort(() => Math.random() - 0.5);
        bot1 = { name: `东家·${shuffledBots[0].name.split('·')[1] || '巧手'}`, avatar: shuffledBots[0].avatar };
        bot2 = { name: `北家·${shuffledBots[1].name.split('·')[1] || '霸主'}`, avatar: shuffledBots[1].avatar };
        bot3 = { name: `西家·${shuffledBots[2].name.split('·')[1] || '智星'}`, avatar: shuffledBots[2].avatar };
      }

      // Seating order counter-clockwise: 0=Bottom(南家), 1=Right(东家), 2=Top(北家), 3=Left(西家)
      const players: Player[] = [
        {
          id: 'player-0',
          name: userProfile.nickname,
          cards: p0Cards,
          isAI: false,
          score: p0Score,
          avatar: userProfile.avatar,
          position: 'bottom',
          accumulatedCards: prevPlayers?.[0]?.accumulatedCards || 0,
        },
        {
          id: 'player-1',
          name: bot1.name,
          cards: p1Cards,
          isAI: true,
          score: p1Score,
          avatar: bot1.avatar,
          position: 'right', // 逆时针第一家: 东家
          accumulatedCards: prevPlayers?.[1]?.accumulatedCards || 0,
        },
        {
          id: 'player-2',
          name: bot2.name,
          cards: p2Cards,
          isAI: true,
          score: p2Score,
          avatar: bot2.avatar,
          position: 'top', // 逆时针第二家: 北家
          accumulatedCards: prevPlayers?.[2]?.accumulatedCards || 0,
        },
        {
          id: 'player-3',
          name: bot3.name,
          cards: p3Cards,
          isAI: true,
          score: p3Score,
          avatar: bot3.avatar,
          position: 'left', // 逆时针第三家: 西家
          accumulatedCards: prevPlayers?.[3]?.accumulatedCards || 0,
        },
      ];

      // Round Starter Logic:
      // - Round 1 of a Match: Player holding diamond-2 (方块2) goes first, must play a hand with diamond-2!
      // - Round 2+ of a Match: Player who won the previous round leads the first trick of the new round!
      let starterCardId = '';
      let isFirstTrick = false;
      let starterPlayerIdx = 0;

      if (round === 1) {
        starterCardId = 'diamond-2';
        isFirstTrick = true;
        for (let i = 0; i < 4; i++) {
          if (players[i].cards.some(c => c.id === 'diamond-2')) {
            starterPlayerIdx = i;
            break;
          }
        }
      } else {
        starterCardId = '';
        isFirstTrick = false;
        starterPlayerIdx = typeof lastWinnerIdx === 'number' && lastWinnerIdx >= 0 ? lastWinnerIdx : 0;
      }

      return {
        phase: 'PLAYING',
        room,
        players,
        currentPlayerIndex: starterPlayerIdx,
        starterCardId,
        isFirstTrick,
        lastValidHand: null,
        passCount: 0,
        trickLeaderIndex: starterPlayerIdx,
        history: [],
        winnerIndex: null,
        lastRoundWinnerIndex: typeof lastWinnerIdx === 'number' ? lastWinnerIdx : null,
        matchNumber: matchNum,
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
    starterCardId: 'diamond-2',
    isFirstTrick: true,
    lastValidHand: null,
    passCount: 0,
    trickLeaderIndex: 0,
    history: [],
    winnerIndex: null,
    lastRoundWinnerIndex: null,
    matchNumber: 1,
    roundNumber: 1,
    multiplier: 1,
  }));

  // Enter room from lobby
  const handleSelectRoom = (room: RoomConfig, matchedBots?: { name: string; avatar: string }[]) => {
    setCurrentRoom(room);
    const newGame = initGame(room, undefined, 1, matchedBots, null, 1);
    setGameState(newGame);

    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Continue to Next Round in the same match (keeps accumulated cards, last round winner leads!)
  const handleStartNewGame = () => {
    const nextRound = gameState.roundNumber + 1;
    const lastWinner = gameState.winnerIndex;
    const newGame = initGame(currentRoom, gameState.players, nextRound, undefined, lastWinner, gameState.matchNumber);
    setGameState(newGame);

    for (let i = 0; i < 4; i++) {
      setTimeout(() => sounds.playDeal(), i * 90);
    }
  };

  // Start a Brand New Match (reset accumulated cards to 0, start with diamond-2!)
  const handleStartNewMatch = () => {
    const resetPlayers = gameState.players.map(p => ({ ...p, accumulatedCards: 0 }));
    const nextMatchNum = gameState.matchNumber + 1;
    const newGame = initGame(currentRoom, resetPlayers, 1, undefined, null, nextMatchNum);
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
  const handleUpdateGameState = useCallback((newState: GameState) => {
    setGameState(newState);
    if (newState.players[0]) {
      const isWon = newState.phase === 'GAME_OVER' && newState.winnerIndex === 0;
      const isLost = newState.phase === 'GAME_OVER' && newState.winnerIndex !== 0 && newState.winnerIndex !== null;

      const newCoins = newState.players[0].score;

      setUserProfile(prev => {
        const newWins = isWon ? prev.wins + 1 : prev.wins;
        const newLosses = isLost ? prev.losses + 1 : prev.losses;

        if (prev.coins === newCoins && prev.wins === newWins && prev.losses === newLosses) {
          return prev;
        }

        authStore.syncUserCoins(newCoins, isWon, isLost);
        return {
          ...prev,
          coins: newCoins,
          wins: newWins,
          losses: newLosses,
        };
      });
    }
  }, []);

  return (
    <ThemeProvider>
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
            onStartNewMatch={handleStartNewMatch}
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
    </ThemeProvider>
  );
}
