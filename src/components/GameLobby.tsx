import React, { useState, useEffect } from 'react';
import { RoomConfig, UserProfile } from '../types/game';
import { UserAccount } from '../utils/authStore';
import { sounds } from '../utils/audio';
import { voiceEngine, DIALECT_OPTIONS } from '../utils/voiceSystem';
import { useAppTheme } from '../utils/themeContext';
import { useLandscape } from './LandscapeWrapper';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Flame,
  BookOpen,
  Volume2,
  Sparkles,
  Coins,
  Gem,
  Plus,
  Play,
  Settings,
  X,
  Users,
  ShieldCheck,
  User,
  Mic,
  Loader2,
  Shuffle,
  CheckCircle2,
  PlusCircle,
  LogIn,
  Copy,
  Check,
  Lock,
  Bot,
  UserPlus,
  Trash2,
  Crown,
  Share2,
  Palette,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export const CHUDADI_ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-chudadi',
    name: '♠️ 锄大地',
    tag: '底分 1,000 积分 · 满4人开局 · 首出♦️2 · 逆时针出牌',
    baseScore: 1000,
    entryMin: 100,
    maxMultiplier: 128,
    colorTheme: 'from-emerald-600 via-teal-800 to-slate-950',
    badge: '正宗4人桌',
    mode: 'classic',
  },
  {
    id: 'room-yansan',
    name: '🔥 烟三',
    tag: '底分 2,000 积分 · 满4人开局 · 烟三特色组合 · 3倍关门',
    baseScore: 2000,
    entryMin: 2000,
    maxMultiplier: 256,
    colorTheme: 'from-amber-600 via-red-800 to-slate-950',
    badge: '正宗4人桌',
    mode: 'master',
  },
];

const MATCH_BOT_POOL = [
  { name: '西家·智多星', avatar: '🤖', title: '雀界高人' },
  { name: '北家·雀圣霸主', avatar: '👑', title: '赌神附体' },
  { name: '东家·常胜猫仙', avatar: '🐱', title: '运势爆棚' },
  { name: '西家·独孤求败', avatar: '🧙‍♂️', title: '绝世老手' },
  { name: '北家·神算巧手', avatar: '🧐', title: '精确推演' },
  { name: '东家·翻盘小狂人', avatar: '🤠', title: '绝地反击' },
];

export interface CustomRoomSeat {
  position: 'bottom' | 'left' | 'top' | 'right';
  playerName: string;
  avatar: string;
  isHost: boolean;
  isAI: boolean;
  ready: boolean;
  phone?: string;
}

export interface CustomRoomState {
  code: string; // 6-digit room code
  mode: 'room-chudadi' | 'room-yansan';
  roomName: string;
  baseScore: number;
  entryMin: number;
  hostName: string;
  isPrivate: boolean;
  passcode?: string;
  seats: CustomRoomSeat[];
}

interface GameLobbyProps {
  userProfile: UserProfile;
  currentUser: UserAccount | null;
  onSelectRoom: (room: RoomConfig, matchedBots?: { name: string; avatar: string }[]) => void;
  onUpdateCoins: (newCoins: number) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAuth: (tab?: 'LOGIN' | 'REGISTER') => void;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  userProfile,
  currentUser,
  onSelectRoom,
  onUpdateCoins,
  soundEnabled,
  onToggleSound,
  onOpenAuth,
}) => {
  const { theme, toggleTheme, themeConfig } = useAppTheme();
  const { isFullscreen, toggleFullscreen } = useLandscape();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFreeBeansModal, setShowFreeBeansModal] = useState(false);

  // 1. Auto Matching State
  const [matchingRoom, setMatchingRoom] = useState<RoomConfig | null>(null);
  const [matchedPlayers, setMatchedPlayers] = useState<
    { position: 'bottom' | 'left' | 'top' | 'right'; name: string; avatar: string; ready: boolean }[]
  >([]);

  // 2. Custom Room Creation Modal State
  const [createModalRoom, setCreateModalRoom] = useState<RoomConfig | null>(null);
  const [customRoomName, setCustomRoomName] = useState<string>('');
  const [customBaseScore, setCustomBaseScore] = useState<number>(1000);
  const [customPasscode, setCustomPasscode] = useState<string>('');
  const [allowBotFill, setAllowBotFill] = useState<boolean>(true);

  // 3. Join Room Modal State
  const [showJoinRoomModal, setShowJoinRoomModal] = useState<boolean>(false);
  const [joinRoomCodeInput, setJoinRoomCodeInput] = useState<string>('');
  const [joinErrorMsg, setJoinErrorMsg] = useState<string>('');

  // 4. Room Waiting Lobby Modal State
  const [waitingRoom, setWaitingRoom] = useState<CustomRoomState | null>(null);
  const [copiedCodeSuccess, setCopiedCodeSuccess] = useState<boolean>(false);

  // Daily Checkin
  const handleDailyCheckin = () => {
    if (userProfile.hasCheckedInToday) {
      sounds.playClick();
      alert('您今天已经签到领过福利积分了，明天再来吧！');
      return;
    }
    sounds.playCoins();
    onUpdateCoins(userProfile.coins + 3000);
    alert('🎉 每日签到成功！恭喜获得 3,000 福利积分奖励！');
  };

  const winRate =
    userProfile.wins + userProfile.losses === 0
      ? 100
      : Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100);

  // ---------------- FEATURE 1: AUTO MATCHING ----------------
  const handleStartMatching = (room: RoomConfig) => {
    if (userProfile.coins < room.entryMin) {
      sounds.playPass();
      alert(`进入【${room.name}】需要至少 ${room.entryMin.toLocaleString()} 积分！`);
      return;
    }

    sounds.playClick();
    setMatchingRoom(room);

    const initialSeats = [
      { position: 'bottom' as const, name: userProfile.nickname, avatar: userProfile.avatar, ready: true },
      { position: 'left' as const, name: '匹配中...', avatar: '❓', ready: false },
      { position: 'top' as const, name: '匹配中...', avatar: '❓', ready: false },
      { position: 'right' as const, name: '匹配中...', avatar: '❓', ready: false },
    ];
    setMatchedPlayers(initialSeats);

    const shuffled = [...MATCH_BOT_POOL].sort(() => Math.random() - 0.5);
    const bot1 = shuffled[0];
    const bot2 = shuffled[1];
    const bot3 = shuffled[2];

    setTimeout(() => {
      sounds.playClick();
      setMatchedPlayers(prev => [
        prev[0],
        { position: 'left', name: bot1.name, avatar: bot1.avatar, ready: true },
        prev[2],
        prev[3],
      ]);
    }, 500);

    setTimeout(() => {
      sounds.playClick();
      setMatchedPlayers(prev => [
        prev[0],
        prev[1],
        { position: 'top', name: bot2.name, avatar: bot2.avatar, ready: true },
        prev[3],
      ]);
    }, 1100);

    setTimeout(() => {
      sounds.playCoins();
      setMatchedPlayers([
        { position: 'bottom', name: userProfile.nickname, avatar: userProfile.avatar, ready: true },
        { position: 'left', name: bot1.name, avatar: bot1.avatar, ready: true },
        { position: 'top', name: bot2.name, avatar: bot2.avatar, ready: true },
        { position: 'right', name: bot3.name, avatar: bot3.avatar, ready: true },
      ]);

      setTimeout(() => {
        onSelectRoom(room, [
          { name: bot1.name, avatar: bot1.avatar },
          { name: bot2.name, avatar: bot2.avatar },
          { name: bot3.name, avatar: bot3.avatar },
        ]);
        setMatchingRoom(null);
      }, 700);
    }, 1700);
  };

  // ---------------- FEATURE 2: CREATE ROOM ----------------
  const openCreateRoomModal = (room: RoomConfig) => {
    sounds.playClick();
    setCreateModalRoom(room);
    setCustomRoomName(`${userProfile.nickname}的${room.id === 'room-yansan' ? '🔥烟三' : '♠️锄大地'}私霸房`);
    setCustomBaseScore(room.baseScore);
    setCustomPasscode('');
    setAllowBotFill(true);
  };

  const handleConfirmCreateRoom = async () => {
    if (!createModalRoom) return;

    if (userProfile.coins < createModalRoom.entryMin) {
      sounds.playPass();
      alert(`创建【${createModalRoom.name}】房间需要至少 ${createModalRoom.entryMin.toLocaleString()} 积分！`);
      return;
    }

    sounds.playCoins();

    // Call server API or construct local room state with 6-digit code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: createModalRoom.id,
          roomName: customRoomName.trim() || `${userProfile.nickname}的私房`,
          baseScore: customBaseScore,
          entryMin: createModalRoom.entryMin,
          hostName: userProfile.nickname,
          avatar: userProfile.avatar,
          isPrivate: !!customPasscode.trim(),
          passcode: customPasscode.trim(),
          allowBotFill,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setWaitingRoom(data.room);
      } else {
        // Fallback local room creation
        createLocalWaitingRoom(generatedCode);
      }
    } catch {
      createLocalWaitingRoom(generatedCode);
    }

    setCreateModalRoom(null);
  };

  const createLocalWaitingRoom = (code: string) => {
    if (!createModalRoom) return;
    const newRoom: CustomRoomState = {
      code,
      mode: createModalRoom.id === 'room-yansan' ? 'room-yansan' : 'room-chudadi',
      roomName: customRoomName.trim() || `${userProfile.nickname}的私人房`,
      baseScore: customBaseScore,
      entryMin: createModalRoom.entryMin,
      hostName: userProfile.nickname,
      isPrivate: !!customPasscode.trim(),
      passcode: customPasscode.trim(),
      seats: [
        { position: 'bottom', playerName: userProfile.nickname, avatar: userProfile.avatar, isHost: true, isAI: false, ready: true },
        { position: 'left', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
        { position: 'top', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
        { position: 'right', playerName: '空位', avatar: '❓', isHost: false, isAI: false, ready: false },
      ],
    };
    setWaitingRoom(newRoom);
  };

  // ---------------- FEATURE 3: JOIN ROOM ----------------
  const handleConfirmJoinRoom = async (codeToJoin?: string) => {
    const code = (codeToJoin || joinRoomCodeInput).trim();
    if (code.length !== 6) {
      setJoinErrorMsg('请输入 6 位数字房间号！');
      sounds.playPass();
      return;
    }

    sounds.playClick();
    setJoinErrorMsg('');

    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          playerName: userProfile.nickname,
          avatar: userProfile.avatar,
        }),
      });
      const data = await res.json();
      if (data.success && data.room) {
        setWaitingRoom(data.room);
        setShowJoinRoomModal(false);
        setJoinRoomCodeInput('');
      } else {
        // Fallback local join for sample room or local code
        setJoinErrorMsg(data.error || '未找到该房间，请核对 6 位房号！');
        sounds.playPass();
      }
    } catch {
      setJoinErrorMsg('未找到该 6 位数房间，请核对或直接新建房间！');
      sounds.playPass();
    }
  };

  // Invite Bot to Empty Seat in Custom Room
  const handleAddBotToSeat = (seatIdx: number) => {
    if (!waitingRoom) return;
    sounds.playClick();

    const shuffled = [...MATCH_BOT_POOL].sort(() => Math.random() - 0.5);
    const bot = shuffled[seatIdx % shuffled.length];

    const updatedSeats = [...waitingRoom.seats];
    updatedSeats[seatIdx] = {
      position: ['bottom', 'left', 'top', 'right'][seatIdx] as any,
      playerName: bot.name,
      avatar: bot.avatar,
      isHost: false,
      isAI: true,
      ready: true,
    };

    setWaitingRoom({
      ...waitingRoom,
      seats: updatedSeats,
    });
  };

  // Kick seat in Custom Room
  const handleKickSeat = (seatIdx: number) => {
    if (!waitingRoom) return;
    sounds.playClick();

    const updatedSeats = [...waitingRoom.seats];
    updatedSeats[seatIdx] = {
      position: ['bottom', 'left', 'top', 'right'][seatIdx] as any,
      playerName: '空位',
      avatar: '❓',
      isHost: false,
      isAI: false,
      ready: false,
    };

    setWaitingRoom({
      ...waitingRoom,
      seats: updatedSeats,
    });
  };

  // Fill all empty seats with bots instantly and start
  const handleFillAllBotsAndStart = () => {
    if (!waitingRoom) return;
    sounds.playCoins();

    const updatedSeats = [...waitingRoom.seats];
    const shuffled = [...MATCH_BOT_POOL].sort(() => Math.random() - 0.5);

    for (let i = 1; i < 4; i++) {
      if (updatedSeats[i].playerName === '空位') {
        const bot = shuffled[i - 1];
        updatedSeats[i] = {
          position: ['bottom', 'left', 'top', 'right'][i] as any,
          playerName: bot.name,
          avatar: bot.avatar,
          isHost: false,
          isAI: true,
          ready: true,
        };
      }
    }

    const roomPreset: RoomConfig = {
      id: waitingRoom.mode,
      name: waitingRoom.roomName,
      tag: `房号 [${waitingRoom.code}] · 底分 ${waitingRoom.baseScore}`,
      baseScore: waitingRoom.baseScore,
      entryMin: waitingRoom.entryMin,
      maxMultiplier: 256,
      colorTheme: 'from-amber-600 via-teal-800 to-slate-950',
      badge: '好友私房',
      mode: waitingRoom.mode === 'room-yansan' ? 'master' : 'classic',
    };

    const matchedBots = [
      { name: updatedSeats[1].playerName, avatar: updatedSeats[1].avatar },
      { name: updatedSeats[2].playerName, avatar: updatedSeats[2].avatar },
      { name: updatedSeats[3].playerName, avatar: updatedSeats[3].avatar },
    ];

    onSelectRoom(roomPreset, matchedBots);
    setWaitingRoom(null);
  };

  const copyRoomCodeToClipboard = () => {
    if (!waitingRoom) return;
    navigator.clipboard.writeText(waitingRoom.code);
    sounds.playClick();
    setCopiedCodeSuccess(true);
    setTimeout(() => setCopiedCodeSuccess(false), 2000);
  };

  return (
    <div 
      className={`w-full h-full flex flex-col justify-between p-1.5 sm:p-2.5 select-none text-white relative overflow-hidden transition-colors duration-300 ${
        theme === 'deep-green'
          ? 'bg-gradient-to-br from-[#124d36] via-[#1b6b4c] to-[#0f432e]'
          : 'bg-gradient-to-br from-[#144f77] via-[#1c6d9f] to-[#104365]'
      }`}
    >
      {/* Background Ambient Effects */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{
          background: theme === 'deep-green'
            ? 'radial-gradient(ellipse at top, rgba(52,211,153,0.18) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at top, rgba(56,189,248,0.18) 0%, transparent 70%)'
        }}
      />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Header & Profile - Unified Height (h-7 sm:h-8) & Consistent Amber/Theme Text Color */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Avatar & Profile Capsule */}
          <div 
            className={`h-7 sm:h-8 flex items-center gap-1.5 backdrop-blur-md pl-1 pr-2.5 rounded-full border shadow transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/50 text-amber-300'
                : 'bg-[#134d73]/90 border-cyan-400/50 text-amber-300'
            }`}
          >
            <div className="relative">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-0.5 shadow flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs">
                  {userProfile.avatar}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 text-[6px] font-black px-1 rounded-full bg-emerald-600 text-white ring-1 ring-white/20">
                4人
              </span>
            </div>

            <div className="flex items-center gap-1 leading-none">
              <span className="font-bold text-xs text-amber-300 truncate max-w-[70px] sm:max-w-[100px]">
                {userProfile.nickname}
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono hidden sm:inline">
                {winRate}%胜
              </span>
            </div>
          </div>

          {/* 积分 Capsule */}
          <div 
            className={`h-7 sm:h-8 flex items-center gap-1.5 backdrop-blur-md pl-2 pr-1 rounded-full border shadow transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/50 text-amber-300'
                : 'bg-[#134d73]/90 border-cyan-400/50 text-amber-300'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 font-black text-[9px] shadow">
              分
            </div>
            <span className="font-mono font-bold text-xs text-amber-300 px-0.5">
              {userProfile.coins.toLocaleString()}
            </span>
            <button
              onClick={() => setShowFreeBeansModal(true)}
              className="w-4 h-4 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 flex items-center justify-center text-slate-950 font-black cursor-pointer shadow active:scale-95"
              title="免费增加积分"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          {/* 钻石 Badge */}
          <div 
            className={`h-7 sm:h-8 hidden md:flex items-center gap-1 backdrop-blur-md px-2.5 rounded-full border shadow transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/50 text-amber-300'
                : 'bg-[#134d73]/90 border-cyan-400/50 text-amber-300'
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-mono font-bold text-xs text-amber-300">
              {userProfile.diamonds}
            </span>
          </div>
        </div>

        {/* Right Nav Controls: Unified Height (h-7 sm:h-8) & Consistent Amber/Theme Text Color */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Fullscreen Toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              toggleFullscreen();
            }}
            className={`h-7 sm:h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold text-amber-300 shadow cursor-pointer transition-all ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 hover:bg-[#185e42] border-emerald-400/50'
                : 'bg-[#134d73]/90 hover:bg-[#185c8a] border-cyan-400/50'
            }`}
            title={isFullscreen ? '退出全屏' : '全屏显示'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? '退出全屏' : '全屏'}</span>
          </button>

          {/* Eye-Friendly Theme Toggle */}
          <button
            onClick={() => {
              sounds.playClick();
              toggleTheme();
            }}
            className={`h-7 sm:h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold text-amber-300 shadow cursor-pointer transition-all ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 hover:bg-[#185e42] border-emerald-400/50'
                : 'bg-[#134d73]/90 hover:bg-[#185c8a] border-cyan-400/50'
            }`}
            title="切换养眼主题 (翡翠草绿 / 湖水湛蓝)"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{theme === 'deep-green' ? '翡翠绿' : '湖水蓝'}</span>
          </button>

          {/* Join Room Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowJoinRoomModal(true);
            }}
            className={`h-7 sm:h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold text-amber-300 shadow cursor-pointer transition-all ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 hover:bg-[#185e42] border-emerald-400/50'
                : 'bg-[#134d73]/90 hover:bg-[#185c8a] border-cyan-400/50'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>输入房号</span>
          </button>

          {currentUser ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className={`h-7 sm:h-8 flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold text-amber-300 shadow cursor-pointer transition-all ${
                theme === 'deep-green'
                  ? 'bg-[#134d35]/90 hover:bg-[#185e42] border-emerald-400/50'
                  : 'bg-[#134d73]/90 hover:bg-[#185c8a] border-cyan-400/50'
              }`}
              title={`已登录: ${currentUser.phone}`}
            >
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[65px]">{currentUser.nickname}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className="h-7 sm:h-8 flex items-center gap-1 px-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-bold text-xs shadow cursor-pointer transition-all border border-amber-300/40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
              <span>登录 / 注册</span>
            </button>
          )}

          <button
            onClick={handleDailyCheckin}
            className={`h-7 sm:h-8 relative hidden sm:flex items-center gap-1 px-2.5 rounded-full border text-xs font-bold text-amber-300 shadow cursor-pointer transition-all ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 hover:bg-[#185e42] border-emerald-400/50'
                : 'bg-[#134d73]/90 hover:bg-[#185c8a] border-cyan-400/50'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>签到积分</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className={`h-7 sm:h-8 w-7 sm:w-8 flex items-center justify-center rounded-full border text-amber-300 text-xs transition-all cursor-pointer shadow ${
              theme === 'deep-green'
                ? 'bg-[#134d35]/90 border-emerald-400/50 hover:bg-[#185e42]'
                : 'bg-[#134d73]/90 border-cyan-400/50 hover:bg-[#185c8a]'
            }`}
            title="系统设置"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* CENTER SECTION: Clean, Borderless & Spacious Floating Game Cards */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar flex flex-col justify-between py-2 sm:py-3">
        {/* 2 GAME ROOM SECTIONS: Floating spacious cards with increased height, spread top & bottom */}
        <div className="flex-1 flex flex-col justify-between gap-3 sm:gap-4 max-w-xl sm:max-w-2xl md:max-w-4xl mx-auto w-full px-1.5 sm:px-3 my-auto">
          {CHUDADI_ROOM_PRESETS.map((room) => {
            const canEnter = userProfile.coins >= room.entryMin;
            const isChudadi = room.id === 'room-chudadi';

            return (
              <div
                key={room.id}
                className={`relative rounded-3xl sm:rounded-4xl p-4 sm:p-5 md:p-6 transition-all duration-300 flex items-center justify-between overflow-hidden shadow-2xl min-h-[110px] sm:min-h-[130px] md:min-h-[145px] group ${
                  canEnter
                    ? theme === 'deep-green'
                      ? 'bg-gradient-to-r from-[#145339]/95 via-[#1c6e4d]/95 to-[#124b34]/95 shadow-emerald-950/50 hover:shadow-emerald-500/20 hover:scale-[1.01]'
                      : 'bg-gradient-to-r from-[#144f75]/95 via-[#1c6999]/95 to-[#124667]/95 shadow-cyan-950/50 hover:shadow-cyan-500/20 hover:scale-[1.01]'
                    : 'bg-black/40 opacity-60'
                }`}
              >
                {/* Background Watermark Symbol */}
                <div className="absolute right-48 sm:right-64 -bottom-6 opacity-10 font-black text-7xl sm:text-9xl pointer-events-none select-none text-white">
                  {isChudadi ? '♠️' : '🔥'}
                </div>

                {/* Left Side: Large Title, Badge, Description & Rules */}
                <div className="flex flex-col justify-center z-10 min-w-0 pr-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    {/* ENLARGED TITLE: 锄大地 in Gray, 烟三 in White */}
                    <h2 
                      className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-wide drop-shadow transition-colors ${
                        isChudadi 
                          ? 'text-slate-300 group-hover:text-slate-100' 
                          : 'text-white group-hover:text-white'
                      }`}
                    >
                      {room.name}
                    </h2>

                    <span 
                      className={`text-[11px] sm:text-xs font-bold px-3 py-0.5 rounded-full shadow ${
                        isChudadi 
                          ? 'bg-slate-700/80 text-slate-200' 
                          : 'bg-white/20 text-white'
                      }`}
                    >
                      {room.badge}
                    </span>

                    <span 
                      className={`text-[11px] sm:text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-black/40 ${
                        isChudadi 
                          ? 'text-slate-300 border border-slate-600/40' 
                          : 'text-white border border-white/40'
                      }`}
                    >
                      底分 {room.baseScore.toLocaleString()}
                    </span>
                  </div>

                  <p 
                    className={`text-xs sm:text-sm mt-1.5 line-clamp-1 leading-tight font-medium ${
                      isChudadi ? 'text-slate-400' : 'text-white/90'
                    }`}
                  >
                    {room.tag}
                  </p>

                  <div 
                    className={`text-xs sm:text-sm font-mono flex items-center gap-4 mt-1.5 ${
                      isChudadi ? 'text-slate-400' : 'text-white/90'
                    }`}
                  >
                    <span>
                      准入条件: <strong className={`font-black ${isChudadi ? 'text-slate-200' : 'text-white'}`}>{room.entryMin.toLocaleString()}</strong> 积分
                    </span>
                    <span className={`font-bold hidden sm:inline ${isChudadi ? 'text-slate-300' : 'text-white'}`}>
                      ⚡ 满4人即开
                    </span>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2.5 sm:gap-3.5 z-10 shrink-0">
                  {/* 1. Quick Match Button */}
                  <button
                    disabled={!canEnter}
                    onClick={() => handleStartMatching(room)}
                    className={`py-2.5 sm:py-3 px-4 sm:px-6 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xl active:scale-95 ${
                      !canEnter
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : isChudadi
                        ? 'bg-slate-700 hover:bg-slate-600 text-slate-100 shadow-slate-900/40'
                        : 'bg-white hover:bg-slate-100 text-slate-950 shadow-white/20'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>⚡ 自动匹配</span>
                  </button>

                  {/* 2. Create Custom Room Button */}
                  <button
                    disabled={!canEnter}
                    onClick={() => openCreateRoomModal(room)}
                    className={`py-2.5 sm:py-3 px-3.5 sm:px-5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 ${
                      isChudadi
                        ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-600/50'
                        : 'bg-white/15 hover:bg-white/25 text-white border border-white/50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4 text-current" />
                    <span>➕ 创建房间</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: AUTOMATIC MATCHING WAITING */}
      {matchingRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-sm w-full p-3 shadow-2xl flex flex-col items-center text-center gap-2 max-h-[82vh] overflow-hidden transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            <div className="flex items-center gap-2 text-amber-300 font-black text-sm sm:text-base">
              <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
              <span>{matchingRoom.name} · 4人桌自动匹配中</span>
            </div>

            <p className="text-[11px] text-white/90">
              正在为您寻找同好玩家，满 <strong className="text-amber-300 font-bold">4 位玩家</strong> 自动洗牌开局！
            </p>

            {/* 4 Seats Circle Visual */}
            <div className="grid grid-cols-2 gap-2 w-full my-0.5">
              {matchedPlayers.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-1.5 rounded-xl flex items-center gap-2 transition-all duration-300 ${
                    p.ready
                      ? theme === 'deep-green'
                        ? 'bg-[#0e3b28]/95 text-white shadow'
                        : 'bg-[#0e3752]/95 text-white shadow'
                      : 'bg-black/25 text-white/50'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-black/30 flex items-center justify-center text-sm shrink-0">
                    {p.avatar}
                  </div>
                  <div className="text-left leading-tight truncate">
                    <div className="font-bold text-[11px] truncate">
                      {p.name}
                      {p.position === 'bottom' && <span className="text-[9px] text-amber-300 ml-0.5">(您)</span>}
                    </div>
                    <div className="text-[9px] font-mono flex items-center gap-1 mt-0.5">
                      {p.ready ? (
                        <span className="text-amber-300 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-amber-300" /> 已就座
                        </span>
                      ) : (
                        <span className="text-white/60 animate-pulse">寻找玩家...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMatchingRoom(null)}
              className={`w-full py-1.5 rounded-xl text-white/90 font-bold text-xs cursor-pointer transition-colors mt-0.5 ${
                theme === 'deep-green'
                  ? 'bg-[#0e3b28]/90 hover:bg-[#0e3b28]'
                  : 'bg-[#0e3752]/90 hover:bg-[#0e3752]'
              }`}
            >
              取消匹配
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CUSTOM ROOM MODAL */}
      {createModalRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-lg w-full p-3 shadow-2xl flex flex-col gap-2 max-h-[82vh] overflow-hidden transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 shrink-0">
              <h3 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>创建 4 人对局房间 ({createModalRoom.name})</span>
              </h3>
              <button
                onClick={() => setCreateModalRoom(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
              <div className="space-y-2">
                <div>
                  <label className="block text-amber-200 mb-1 font-bold text-[11px]">房间名称</label>
                  <input
                    type="text"
                    value={customRoomName}
                    onChange={e => setCustomRoomName(e.target.value)}
                    placeholder="请输入房间名称..."
                    className={`w-full rounded-xl px-2.5 py-1.5 text-white font-bold text-xs focus:outline-none ${
                      theme === 'deep-green'
                        ? 'bg-[#0e3b28]/90 focus:ring-1 focus:ring-amber-300'
                        : 'bg-[#0e3752]/90 focus:ring-1 focus:ring-amber-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-amber-200 mb-1 font-bold text-[11px]">底分选择</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[1000, 2000, 5000].map(score => (
                      <button
                        key={score}
                        onClick={() => setCustomBaseScore(score)}
                        className={`py-1 rounded-xl font-bold text-[10px] transition-all cursor-pointer ${
                          customBaseScore === score
                            ? 'bg-amber-400 text-slate-950 shadow font-black'
                            : theme === 'deep-green'
                            ? 'bg-[#0e3b28]/90 text-emerald-100 hover:bg-[#155b3c]'
                            : 'bg-[#0e3752]/90 text-cyan-100 hover:bg-[#155b85]'
                        }`}
                      >
                        底分 {score}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-amber-200 mb-1 font-bold text-[11px]">房间口令密码 (选填)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={customPasscode}
                    onChange={e => setCustomPasscode(e.target.value)}
                    placeholder="为空即公开，填密码仅好友可入"
                    className={`w-full rounded-xl px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none ${
                      theme === 'deep-green'
                        ? 'bg-[#0e3b28]/90 focus:ring-1 focus:ring-amber-300'
                        : 'bg-[#0e3752]/90 focus:ring-1 focus:ring-amber-300'
                    }`}
                  />
                </div>

                <div 
                  className={`p-2 rounded-xl text-[10px] leading-relaxed ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90 text-emerald-100'
                      : 'bg-[#0e3752]/90 text-cyan-100'
                  }`}
                >
                  💡 创建成功后将生成 <strong className="text-amber-300">6 位专属房号</strong>，可直接复制发送给好友一键加入！
                </div>
              </div>
            </div>

            <div className="pt-1.5 border-t border-white/10 shrink-0">
              <button
                onClick={handleConfirmCreateRoom}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow hover:brightness-105 active:scale-98"
              >
                🚀 生成 6 位房号并进入房间
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: JOIN ROOM BY 6-DIGIT CODE */}
      {showJoinRoomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-lg w-full p-3 shadow-2xl flex flex-col gap-2 max-h-[82vh] overflow-hidden transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
              <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>输入 6 位数字房号加入房间</span>
              </h3>
              <button
                onClick={() => {
                  setShowJoinRoomModal(false);
                  setJoinErrorMsg('');
                }}
                className="text-white/70 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 items-center flex-1 min-h-0">
              {/* Left Column: PIN Display & Quick Action */}
              <div className="flex flex-col items-center justify-center text-center space-y-1.5">
                <p className="text-[11px] text-white/90">
                  请输入 6 位数字好友房间号：
                </p>

                {/* 6-Digit PIN Display */}
                <div className="flex items-center justify-center gap-1 my-0.5">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-6 h-8 sm:w-7 sm:h-9 rounded-lg flex items-center justify-center font-mono font-black text-sm sm:text-base transition-all ${
                        joinRoomCodeInput[idx]
                          ? theme === 'deep-green'
                            ? 'bg-[#0e3b28] text-amber-300 shadow'
                            : 'bg-[#0e3752] text-amber-300 shadow'
                          : 'bg-black/30 text-white/30'
                      }`}
                    >
                      {joinRoomCodeInput[idx] || '•'}
                    </div>
                  ))}
                </div>

                {joinErrorMsg && (
                  <div className="text-[10px] text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-lg">
                    {joinErrorMsg}
                  </div>
                )}

                <button
                  onClick={() => {
                    const sampleCode = '888888';
                    setJoinRoomCodeInput(sampleCode);
                    handleConfirmJoinRoom(sampleCode);
                  }}
                  className={`text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer font-bold rounded-lg px-2 py-0.5 transition-all ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90'
                      : 'bg-[#0e3752]/90'
                  }`}
                >
                  ⚡ 一键体验示例好友房 (888888)
                </button>
              </div>

              {/* Right Column: Numpad Keyboard */}
              <div className="grid grid-cols-3 gap-1 max-w-[200px] mx-auto w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((num, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      sounds.playClick();
                      if (num === 'C') {
                        setJoinRoomCodeInput('');
                      } else if (num === '⌫') {
                        setJoinRoomCodeInput(prev => prev.slice(0, -1));
                      } else if (joinRoomCodeInput.length < 6) {
                        const next = joinRoomCodeInput + num;
                        setJoinRoomCodeInput(next);
                        if (next.length === 6) {
                          handleConfirmJoinRoom(next);
                        }
                      }
                    }}
                    className={`py-1 rounded-lg font-mono font-bold text-xs cursor-pointer transition-all active:scale-95 ${
                      num === 'C' || num === '⌫'
                        ? 'bg-black/30 text-white/80 hover:bg-black/50'
                        : theme === 'deep-green'
                        ? 'bg-[#0e3b28]/90 text-amber-300 hover:bg-[#155b3c]'
                        : 'bg-[#0e3752]/90 text-amber-300 hover:bg-[#155b85]'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ROOM WAITING LOBBY (房间等待大厅) */}
      {waitingRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-xl w-full p-3 shadow-2xl flex flex-col gap-2 max-h-[82vh] overflow-hidden transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            {/* Header with Room Code */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="truncate">
                  <h3 className="text-xs sm:text-sm font-black text-amber-300 truncate">
                    {waitingRoom.roomName}
                  </h3>
                  <div className="text-[10px] text-white/80 font-mono">
                    底分: <strong className="text-amber-300">{waitingRoom.baseScore.toLocaleString()}</strong> 积分 · 房主: {waitingRoom.hostName}
                  </div>
                </div>
              </div>

              {/* Prominent 6-Digit Room Code Box */}
              <div 
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 shadow shrink-0 ${
                  theme === 'deep-green'
                    ? 'bg-[#0e3b28]/95'
                    : 'bg-[#0e3752]/95'
                }`}
              >
                <div className="text-right">
                  <div className="text-[8px] text-amber-300/80 font-bold">房号:</div>
                  <div className="text-sm font-mono font-black text-amber-200 tracking-wider">
                    {waitingRoom.code}
                  </div>
                </div>
                <button
                  onClick={copyRoomCodeToClipboard}
                  className="p-1 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-bold text-[9px] shadow hover:brightness-105 cursor-pointer active:scale-95 flex items-center gap-0.5"
                >
                  {copiedCodeSuccess ? <Check className="w-3 h-3 text-slate-950" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCodeSuccess ? '已复制' : '复制'}</span>
                </button>
              </div>

              <button
                onClick={() => setWaitingRoom(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg cursor-pointer shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Seats Grid in 4 Columns or 2x2 */}
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <div className="flex items-center justify-between text-[10px] font-bold text-white/90 pb-0.5 shrink-0">
                <span>4 人桌座位状态:</span>
                <span className="text-amber-300 font-mono">
                  {waitingRoom.seats.filter(s => s.playerName !== '空位').length} / 4 人已就绪
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {waitingRoom.seats.map((seat, idx) => {
                  const isEmpty = seat.playerName === '空位';

                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-xl flex flex-col justify-between gap-1 transition-all ${
                        isEmpty
                          ? 'bg-black/20 text-white/40'
                          : seat.isHost
                          ? theme === 'deep-green'
                            ? 'bg-[#0e3b28]/95 text-white shadow'
                            : 'bg-[#0e3752]/95 text-white shadow'
                          : theme === 'deep-green'
                          ? 'bg-[#0e3b28]/95 text-white shadow'
                          : 'bg-[#0e3752]/95 text-white shadow'
                      }`}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <div className="w-6 h-6 rounded-full bg-black/30 flex items-center justify-center text-xs shrink-0">
                          {seat.avatar}
                        </div>
                        <div className="leading-tight truncate">
                          <div className="font-bold text-[10px] truncate flex items-center gap-0.5">
                            <span className="truncate">{seat.playerName}</span>
                            {seat.isHost && <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[8px] text-white/60 font-mono">
                            {seat.isHost ? '房主' : seat.isAI ? '电脑人偶' : isEmpty ? '待入座' : '玩家'}
                          </div>
                        </div>
                      </div>

                      {/* Action for Seat */}
                      {isEmpty ? (
                        <div className="flex items-center gap-1 w-full pt-0.5 border-t border-white/10">
                          <button
                            onClick={() => handleAddBotToSeat(idx)}
                            className="flex-1 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[8px] font-bold cursor-pointer flex items-center justify-center gap-0.5"
                            title="加电脑人偶填补"
                          >
                            <Bot className="w-2.5 h-2.5" />
                            <span>加AI</span>
                          </button>
                          <button
                            onClick={copyRoomCodeToClipboard}
                            className={`flex-1 py-0.5 rounded text-[8px] font-bold cursor-pointer flex items-center justify-center gap-0.5 ${
                              theme === 'deep-green'
                                ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                                : 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                            }`}
                            title="复制邀请口令给真人好友"
                          >
                            <UserPlus className="w-2.5 h-2.5" />
                            <span>邀请</span>
                          </button>
                        </div>
                      ) : (
                        idx !== 0 && (
                          <div className="pt-0.5 border-t border-white/10 flex justify-end">
                            <button
                              onClick={() => handleKickSeat(idx)}
                              className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 hover:bg-rose-900 text-[8px] cursor-pointer"
                              title="请出房间"
                            >
                              请离
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Game or Invite Button */}
            <div className="pt-1.5 border-t border-white/10 space-y-1 shrink-0">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={copyRoomCodeToClipboard}
                  className={`py-1.5 rounded-xl text-amber-300 font-bold text-xs cursor-pointer flex items-center justify-center gap-1 transition-all ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90 hover:bg-[#0e3b28]'
                      : 'bg-[#0e3752]/90 hover:bg-[#0e3752]'
                  }`}
                >
                  <Share2 className="w-3 h-3 text-amber-400" />
                  <span>{copiedCodeSuccess ? '已复制房号' : '邀请真人好友'}</span>
                </button>

                <button
                  onClick={handleFillAllBotsAndStart}
                  className="py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs shadow cursor-pointer hover:brightness-105 active:scale-95 flex items-center justify-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current text-slate-950" />
                  <span>⚡ 一键全员补满开局</span>
                </button>
              </div>

              <div className="flex justify-between items-center text-[9px] text-white/70 px-0.5">
                <span>空位可直接【邀请】或【⚡一键补满开局】</span>
                <button
                  onClick={() => setWaitingRoom(null)}
                  className="text-white/80 hover:text-white underline cursor-pointer"
                >
                  解散/离开房间
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 免费充能补积分 Modal */}
      {showFreeBeansModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-xs w-full p-3 shadow-2xl flex flex-col items-center text-center gap-2 animate-in zoom-in-95 duration-150 transition-colors max-h-[82vh] overflow-hidden ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            <div 
              className={`w-9 h-9 rounded-full flex items-center justify-center text-amber-300 shadow ${
                theme === 'deep-green'
                  ? 'bg-[#0e3b28]'
                  : 'bg-[#0e3752]'
              }`}
            >
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-300">积分补充站</h3>
              <p className="text-[11px] text-white/90 mt-0.5">积分不足？即刻免费补充 5,000 救急积分！</p>
            </div>
            <button
              onClick={() => {
                sounds.playCoins();
                onUpdateCoins(userProfile.coins + 5000);
                setShowFreeBeansModal(false);
              }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow hover:brightness-105"
            >
              免费领取 5,000 积分
            </button>
          </div>
        </div>
      )}

      {/* 系统设置 Modal - Borderless, Low Height, Scrollable Body, Never Clipped */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 select-none">
          <div 
            className={`rounded-2xl max-w-xl w-full p-2.5 sm:p-3 shadow-2xl flex flex-col gap-1.5 animate-in zoom-in-95 duration-150 max-h-[80vh] overflow-hidden transition-colors ${
              theme === 'deep-green'
                ? 'bg-[#145339] text-emerald-50'
                : 'bg-[#144f75] text-cyan-50'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-1 shrink-0">
              <h3 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>系统设置</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-white/70 hover:text-white p-0.5 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable 2-Column Responsive Body */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
              {/* Left Column: Basic Controls */}
              <div className="space-y-1">
                {/* Sound Switch */}
                <div 
                  className={`flex items-center justify-between p-1.5 rounded-xl ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90'
                      : 'bg-[#0e3752]/90'
                  }`}
                >
                  <span className="flex items-center gap-1 text-white/95 font-bold text-[11px]">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>出牌音效</span>
                  </span>
                  <button
                    onClick={onToggleSound}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      soundEnabled 
                        ? 'bg-amber-400 text-slate-950 shadow font-black' 
                        : 'bg-black/30 text-white/50'
                    }`}
                  >
                    {soundEnabled ? '已开启' : '已静音'}
                  </button>
                </div>

                {/* Theme Switcher */}
                <div 
                  className={`flex items-center justify-between p-1.5 rounded-xl ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90'
                      : 'bg-[#0e3752]/90'
                  }`}
                >
                  <span className="flex items-center gap-1 text-white/95 font-bold text-[11px]">
                    <Palette className="w-3.5 h-3.5 text-amber-400" />
                    <span>养眼主题</span>
                  </span>
                  <button
                    onClick={() => {
                      sounds.playClick();
                      toggleTheme();
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      theme === 'deep-green'
                        ? 'bg-[#186443] text-emerald-100 shadow'
                        : 'bg-[#18608f] text-cyan-100 shadow'
                    }`}
                  >
                    {theme === 'deep-green' ? '🌿 翡翠草绿' : '🌊 湖水湛蓝'}
                  </button>
                </div>

                {/* Screen Orientation Info */}
                <div 
                  className={`flex items-center justify-between p-1.5 rounded-xl ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90'
                      : 'bg-[#0e3752]/90'
                  }`}
                >
                  <span className="text-white/95 font-bold text-[11px]">横屏锁定</span>
                  <span className="text-amber-300 font-mono font-bold text-[10px]">固定 90° 横屏</span>
                </div>

                {/* PWA App Install */}
                <div 
                  className={`flex items-center justify-between p-1.5 rounded-xl ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90'
                      : 'bg-[#0e3752]/90'
                  }`}
                >
                  <span className="text-white/95 font-bold text-[11px]">PWA 独立桌面</span>
                  <PWAInstallButton variant="compact" />
                </div>
              </div>

              {/* Right Column: Voice Dialect Picker */}
              <div 
                className={`p-1.5 rounded-xl space-y-1 ${
                  theme === 'deep-green'
                    ? 'bg-[#0e3b28]/90'
                    : 'bg-[#0e3752]/90'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 font-bold text-amber-300 text-[11px]">
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>真人方言配音风格</span>
                  </span>
                  <span className="text-[9px] text-white/60">实时选音</span>
                </div>

                <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {DIALECT_OPTIONS.map(d => {
                    const isActive = voiceEngine.dialect === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          voiceEngine.setDialect(d.id);
                          sounds.speak(`已切换为${d.label}！`);
                        }}
                        className={`p-1 rounded-lg text-left flex items-center gap-1 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-400 text-slate-950 shadow font-black'
                            : theme === 'deep-green'
                            ? 'bg-[#114732]/80 text-white/80 hover:bg-[#186443]'
                            : 'bg-[#12476b]/80 text-white/80 hover:bg-[#18608f]'
                        }`}
                      >
                        <span className="text-xs">{d.icon}</span>
                        <div className="truncate">
                          <div className={`font-bold text-[10px] truncate ${isActive ? 'text-slate-950' : 'text-white'}`}>
                            {d.label}
                          </div>
                          <div className={`text-[8px] truncate ${isActive ? 'text-slate-800' : 'text-white/60'}`}>
                            {d.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-1 border-t border-white/10 shrink-0">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-105 text-slate-950 text-xs font-black cursor-pointer shadow"
              >
                保存并关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
