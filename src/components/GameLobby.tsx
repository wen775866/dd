import React, { useState, useEffect } from 'react';
import { RoomConfig, UserProfile } from '../types/game';
import { UserAccount } from '../utils/authStore';
import { sounds } from '../utils/audio';
import { voiceEngine, DIALECT_OPTIONS } from '../utils/voiceSystem';
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
} from 'lucide-react';

export const CHUDADI_ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-chudadi',
    name: '♠️ 锄大地',
    tag: '底分 1,000 积分 · 满4人开局 · 首出♦️3 · 关门暴击',
    baseScore: 1000,
    entryMin: 100,
    maxMultiplier: 128,
    colorTheme: 'from-emerald-600 via-teal-800 to-slate-950',
    badge: '正宗4人桌',
    mode: 'classic',
  },
  {
    id: 'room-yansan',
    name: '🔥 烟三场',
    tag: '底分 2,000 积分 · 满4人开局 · 特色烟三组合 · 3倍关门',
    baseScore: 2000,
    entryMin: 2000,
    maxMultiplier: 256,
    colorTheme: 'from-amber-600 via-red-800 to-slate-950',
    badge: '烟三热血场',
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
  const [showRulesModal, setShowRulesModal] = useState(false);
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

  // Launch Room Game when 4/4 Ready
  const handleStartCustomRoomGame = () => {
    if (!waitingRoom) return;
    const readySeats = waitingRoom.seats.filter(s => s.playerName !== '空位' && s.ready);
    if (readySeats.length < 4) {
      sounds.playPass();
      alert('房间必须凑齐 4 位玩家（可邀请电脑填补）才可以发牌开局！');
      return;
    }

    sounds.playCoins();

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
      { name: waitingRoom.seats[1].playerName, avatar: waitingRoom.seats[1].avatar },
      { name: waitingRoom.seats[2].playerName, avatar: waitingRoom.seats[2].avatar },
      { name: waitingRoom.seats[3].playerName, avatar: waitingRoom.seats[3].avatar },
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
    <div className="w-full h-full flex flex-col justify-between p-1.5 sm:p-2.5 select-none bg-gradient-to-br from-[#070d1a] via-[#0a1628] to-[#040812] text-white relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Header & Profile */}
      <div className="relative z-10 flex items-center justify-between gap-1.5 px-1 py-0.5 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Avatar & Profile Capsule */}
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md pl-1 pr-2.5 py-0.5 rounded-full border border-emerald-500/40 shadow-lg">
            <div className="relative">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-0.5 shadow flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-sm sm:text-base">
                  {userProfile.avatar}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 text-[7px] font-black px-1 py-0.2 rounded-full bg-emerald-600 text-white shadow ring-1 ring-white/20">
                4人桌
              </span>
            </div>

            <div className="leading-tight">
              <div className="font-black text-xs text-amber-200 truncate max-w-[80px] sm:max-w-[110px]">
                {userProfile.nickname}
              </div>
              <div className="text-[9px] text-amber-400/80 font-mono flex items-center gap-1">
                <span>{winRate}%胜率</span>
              </div>
            </div>
          </div>

          {/* 积分 Capsule */}
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md pl-2 pr-1 py-0.5 rounded-full border border-yellow-500/50 shadow">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 font-black text-[9px] shadow">
              分
            </div>
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm px-0.5">
              {userProfile.coins.toLocaleString()}
            </span>
            <button
              onClick={() => setShowFreeBeansModal(true)}
              className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 flex items-center justify-center text-slate-950 font-black cursor-pointer shadow active:scale-95"
              title="免费增加积分"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
            </button>
          </div>

          {/* 钻石 Badge */}
          <div className="hidden md:flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-cyan-500/40 shadow">
            <Gem className="w-3 h-3 text-cyan-400" />
            <span className="font-mono font-black text-cyan-300 text-xs">
              {userProfile.diamonds}
            </span>
          </div>
        </div>

        {/* Right Nav Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Join Room Button */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowJoinRoomModal(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/50 text-xs font-bold shadow cursor-pointer transition-all"
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
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-emerald-500/40 cursor-pointer shadow"
              title={`已登录: ${currentUser.phone}`}
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[65px]">{currentUser.nickname}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold text-xs shadow cursor-pointer transition-all border border-emerald-400/40"
            >
              <ShieldCheck className="w-3 h-3 text-white" />
              <span>登录 / 注册</span>
            </button>
          )}

          <PWAInstallButton />

          <button
            onClick={handleDailyCheckin}
            className="relative hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow hover:brightness-110 cursor-pointer"
          >
            <Coins className="w-3 h-3" />
            <span>签到积分</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-1 rounded-full bg-black/50 border border-slate-700 hover:bg-slate-800 text-amber-300 text-xs transition-all cursor-pointer shadow"
            title="规则宝典"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-1 rounded-full bg-black/50 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-all cursor-pointer shadow"
            title="系统设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CENTER SECTION: Guaranteed Non-Overflow Scrollable Main Lobby */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto custom-scrollbar my-auto flex flex-col justify-center py-1">
        <div className="text-center mb-1 sm:mb-2 shrink-0">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-bold shadow-inner">
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>♠️ 正宗 4 人对局 · 自动匹配 / 创建私房 / 输入 6 位房号加入</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-md tracking-wider flex items-center justify-center gap-1.5 mt-0.5">
            <span>♠️ 锄大地 & 🔥 烟三场</span>
          </h1>
        </div>

        {/* 2 GAME ROOM SECTIONS SIDE-BY-SIDE */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3.5 max-w-2xl mx-auto w-full px-1 items-stretch">
          {CHUDADI_ROOM_PRESETS.map(room => {
            const canEnter = userProfile.coins >= room.entryMin;
            const isChudadi = room.id === 'room-chudadi';

            return (
              <div
                key={room.id}
                className={`relative rounded-2xl p-2.5 sm:p-3.5 border-2 transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xl group ${
                  canEnter
                    ? isChudadi
                      ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900/90 to-slate-950/95 border-emerald-500/60 hover:border-amber-400 hover:shadow-emerald-500/25'
                      : 'bg-gradient-to-br from-amber-950/90 via-slate-900/90 to-slate-950/95 border-amber-500/60 hover:border-amber-300 hover:shadow-amber-500/25'
                    : 'bg-slate-950/60 opacity-60 border-slate-800'
                }`}
              >
                {/* Background Symbol */}
                <div className="absolute -right-2 -bottom-2 opacity-10 font-black text-5xl sm:text-7xl pointer-events-none select-none text-white">
                  {isChudadi ? '♠️' : '🔥'}
                </div>

                {/* Top Badge & Base Score */}
                <div className="flex items-center justify-between z-10 shrink-0">
                  <span
                    className={`text-[9px] sm:text-[10px] font-black px-2 py-0.2 rounded-full shadow ${
                      isChudadi
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                    }`}
                  >
                    {room.badge}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono font-black text-amber-300 bg-black/50 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                    底分 {room.baseScore.toLocaleString()}
                  </span>
                </div>

                {/* Title & Description Tag */}
                <div className="my-1.5 sm:my-2 z-10">
                  <h2 className="text-base sm:text-xl font-black text-amber-200 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>{room.name}</span>
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-tight">
                    {room.tag}
                  </p>
                </div>

                {/* 3 Entry Action Buttons */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 z-10 shrink-0">
                  <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono flex items-center justify-between">
                    <span>准入: <strong className="text-amber-300">{room.entryMin.toLocaleString()}</strong> 积分</span>
                    <span className="text-emerald-400 font-bold">4人即刻开局</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {/* 1. Quick Match */}
                    <button
                      disabled={!canEnter}
                      onClick={() => handleStartMatching(room)}
                      className={`py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        canEnter
                          ? isChudadi
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow hover:brightness-110'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow hover:brightness-110'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>⚡ 自动匹配</span>
                    </button>

                    {/* 2. Create Custom Room */}
                    <button
                      disabled={!canEnter}
                      onClick={() => openCreateRoomModal(room)}
                      className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-3 h-3 text-amber-400" />
                      <span>➕ 创建房间</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER BAR */}
      <div className="relative z-10 flex items-center justify-between px-2 text-[9px] sm:text-[10px] text-slate-400 border-t border-slate-800/80 pt-0.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>支持 自动匹配 · 6 位房号私房对战 · 语音对讲就绪</span>
        </div>
        <div className="flex items-center gap-2">
          <span>v3.0.0 锄大地</span>
        </div>
      </div>

      {/* MODAL 1: AUTOMATIC MATCHING WAITING */}
      {matchingRoom && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2 text-amber-300 font-black text-base sm:text-lg">
              <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>{matchingRoom.name} · 4人桌自动匹配中</span>
            </div>

            <p className="text-xs text-slate-300">
              正在为您寻找同好玩家，满 <strong className="text-amber-300 font-bold">4 位玩家</strong> 自动洗牌开局！
            </p>

            {/* 4 Seats Circle Visual */}
            <div className="grid grid-cols-2 gap-2.5 w-full my-1">
              {matchedPlayers.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-2xl border flex items-center gap-2 transition-all duration-300 ${
                    p.ready
                      ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-base shrink-0">
                    {p.avatar}
                  </div>
                  <div className="text-left leading-tight truncate">
                    <div className="font-bold text-xs truncate">
                      {p.name}
                      {p.position === 'bottom' && <span className="text-[9px] text-amber-300 ml-0.5">(您)</span>}
                    </div>
                    <div className="text-[10px] font-mono flex items-center gap-1 mt-0.5">
                      {p.ready ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> 已就座
                        </span>
                      ) : (
                        <span className="text-slate-400 animate-pulse">寻找玩家...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setMatchingRoom(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors mt-1"
            >
              取消匹配
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE CUSTOM ROOM MODAL */}
      {createModalRoom && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <span>创建 4 人对局房间 ({createModalRoom.name})</span>
              </h3>
              <button
                onClick={() => setCreateModalRoom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">房间名称</label>
                <input
                  type="text"
                  value={customRoomName}
                  onChange={e => setCustomRoomName(e.target.value)}
                  placeholder="请输入房间名称..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">底分选择</label>
                <div className="grid grid-cols-3 gap-2">
                  {[1000, 2000, 5000].map(score => (
                    <button
                      key={score}
                      onClick={() => setCustomBaseScore(score)}
                      className={`py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                        customBaseScore === score
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      底分 {score}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">房间口令密码 (选填)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={customPasscode}
                  onChange={e => setCustomPasscode(e.target.value)}
                  placeholder="为空即为公开房间，填密码则仅好友可入..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleConfirmCreateRoom}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-110 mt-1"
            >
              🚀 生成 6 位房号并进入房间
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: JOIN ROOM BY 6-DIGIT CODE */}
      {showJoinRoomModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-sm w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-emerald-300 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-emerald-400" />
                <span>输入 6 位数字房号加入</span>
              </h3>
              <button
                onClick={() => {
                  setShowJoinRoomModal(false);
                  setJoinErrorMsg('');
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-300">
                请向房间创建者获取 6 位数字房间号：
              </p>

              {/* 6-Digit PIN Display */}
              <div className="flex items-center justify-center gap-1.5 my-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center font-mono font-black text-lg ${
                      joinRoomCodeInput[idx]
                        ? 'bg-emerald-950 border-emerald-400 text-amber-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}
                  >
                    {joinRoomCodeInput[idx] || '•'}
                  </div>
                ))}
              </div>

              {joinErrorMsg && (
                <div className="text-xs text-rose-400 font-bold">{joinErrorMsg}</div>
              )}

              {/* Numpad Keyboard */}
              <div className="grid grid-cols-3 gap-1.5 max-w-[220px] mx-auto">
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
                    className={`py-2 rounded-xl font-mono font-bold text-sm cursor-pointer transition-all active:scale-95 ${
                      num === 'C' || num === '⌫'
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-950 border border-slate-800 hover:border-emerald-500 text-amber-200 shadow'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>

              {/* Sample Quick Test Join Button */}
              <div className="pt-2 border-t border-slate-800 flex justify-center">
                <button
                  onClick={() => {
                    const sampleCode = '888888';
                    setJoinRoomCodeInput(sampleCode);
                    handleConfirmJoinRoom(sampleCode);
                  }}
                  className="text-xs text-amber-400 hover:underline cursor-pointer font-bold"
                >
                  ⚡ 一键体验示例好友房 (房号: 888888)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ROOM WAITING LOBBY (房间等待大厅) */}
      {waitingRoom && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 animate-in zoom-in-95 duration-150">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Header with Room Code */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-base font-black text-amber-300 flex items-center gap-1.5">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <span>{waitingRoom.roomName}</span>
                </h3>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  底分: <strong className="text-amber-400">{waitingRoom.baseScore.toLocaleString()}</strong> 积分 · 房主: {waitingRoom.hostName}
                </div>
              </div>

              <button
                onClick={() => setWaitingRoom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prominent 6-Digit Room Code Box */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-950 to-amber-950/80 border border-amber-500/50 flex items-center justify-between shadow-inner">
              <div>
                <div className="text-[10px] text-amber-400/80 font-bold">房间号码 (分享邀请好友):</div>
                <div className="text-2xl font-mono font-black text-amber-200 tracking-widest mt-0.5">
                  {waitingRoom.code}
                </div>
              </div>

              <button
                onClick={copyRoomCodeToClipboard}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow hover:brightness-110 cursor-pointer active:scale-95"
              >
                {copiedCodeSuccess ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCodeSuccess ? '已复制' : '复制房号'}</span>
              </button>
            </div>

            {/* 4 Seats Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>4 人桌座位状态:</span>
                <span className="text-emerald-400 font-mono">
                  {waitingRoom.seats.filter(s => s.playerName !== '空位').length} / 4 人已准备
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {waitingRoom.seats.map((seat, idx) => {
                  const isEmpty = seat.playerName === '空位';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isEmpty
                          ? 'bg-slate-950/50 border-slate-800 text-slate-500'
                          : seat.isHost
                          ? 'bg-amber-950/60 border-amber-500/80 text-white shadow'
                          : 'bg-emerald-950/60 border-emerald-500/80 text-white shadow'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-base shrink-0">
                          {seat.avatar}
                        </div>
                        <div className="leading-tight truncate">
                          <div className="font-bold text-xs truncate flex items-center gap-1">
                            <span>{seat.playerName}</span>
                            {seat.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono">
                            {seat.isHost ? '房主' : seat.isAI ? '电脑人偶' : isEmpty ? '可邀请' : '玩家'}
                          </div>
                        </div>
                      </div>

                      {/* Action for Seat */}
                      {isEmpty ? (
                        <button
                          onClick={() => handleAddBotToSeat(idx)}
                          className="p-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[10px] font-bold cursor-pointer shrink-0 flex items-center gap-0.5 border border-amber-500/40"
                          title="加电脑人偶填补"
                        >
                          <Bot className="w-3 h-3" />
                          <span>加AI</span>
                        </button>
                      ) : (
                        idx !== 0 && (
                          <button
                            onClick={() => handleKickSeat(idx)}
                            className="p-1 rounded-lg bg-rose-950 text-rose-400 hover:bg-rose-900 text-[10px] cursor-pointer shrink-0"
                            title="请出房间"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Launch Game or Invite Button */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <button
                onClick={handleStartCustomRoomGame}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/30 cursor-pointer hover:brightness-110 active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>凑齐 4 人，立即发牌开局</span>
              </button>

              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span>空位可随时点击【加AI】自动填满</span>
                <button
                  onClick={() => setWaitingRoom(null)}
                  className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                >
                  离开房间
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 规则宝典 Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>♠️ 锄大地 & 烟三 规则宝典</span>
              </h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">1. 4人桌基础牌值规则</h4>
                <p>• 必须满 <strong className="text-amber-300">4 位玩家</strong> 才可以发牌开局，每人分得 13 张手牌。</p>
                <p>• 点数大小：<strong className="text-amber-300">2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3</strong>（老二最大）。</p>
                <p>• 花色大小：<strong className="text-amber-300">♠黑桃 &gt; ♥红桃 &gt; ♣草花 &gt; ♦方块</strong>。</p>
                <p>• 首局首出：持有 <strong className="text-amber-300">♦3 (方块3)</strong> 的玩家优先首出，且首出必须包含♦3。</p>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">2. 牌型压制规则</h4>
                <p>• 单张 / 对子 / 三条：按点数与最高花色压制。</p>
                <p>• 五张牌型压制顺序：<strong className="text-emerald-300">同花顺 &gt; 铁支 (四带一) &gt; 葫芦 (三带二) &gt; 同花 &gt; 顺子</strong>。</p>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">3. 烟三场特色与积分关门</h4>
                <p>• 烟三场提升底分与翻倍暴击率！</p>
                <p>• 剩 10~12 张牌：<strong className="text-rose-400">双倍积分惩罚</strong>。</p>
                <p>• 剩 13 张未出一张：<strong className="text-rose-500 font-bold">三倍关门暴击 (39倍底分)</strong>！</p>
              </div>
            </div>

            <button
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-110 mt-1"
            >
              我知道了，去开局
            </button>
          </div>
        </div>
      )}

      {/* 免费充能补积分 Modal */}
      {showFreeBeansModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-xs w-full p-5 shadow-2xl flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-300">积分补充站</h3>
              <p className="text-xs text-slate-400 mt-1">积分不足？即刻免费补充 5,000 救急积分！</p>
            </div>
            <button
              onClick={() => {
                sounds.playCoins();
                onUpdateCoins(userProfile.coins + 5000);
                setShowFreeBeansModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-110"
            >
              免费领取 5,000 积分
            </button>
          </div>
        </div>
      )}

      {/* 系统设置 Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                系统设置
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>出牌与背景音效</span>
                </span>
                <button
                  onClick={onToggleSound}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    soundEnabled ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {soundEnabled ? '已开启' : '已静音'}
                </button>
              </div>

              {/* Voice Dialect Picker */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>真人配音风格</span>
                  </span>
                  <span className="text-[10px] text-slate-400">方言选音</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DIALECT_OPTIONS.map(d => {
                    const isActive = voiceEngine.dialect === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          voiceEngine.setDialect(d.id);
                          sounds.speak(`已切换为${d.label}！`);
                        }}
                        className={`p-1.5 rounded-lg border text-left flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-sm">{d.icon}</span>
                        <div className="truncate">
                          <div className="font-bold text-[11px] text-white">{d.label}</div>
                          <div className="text-[9px] text-slate-400 truncate">{d.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>屏幕横屏模式</span>
                <span className="text-amber-400 font-bold">固定 90° 横屏 (已启用)</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>PWA 独立桌面应用</span>
                <PWAInstallButton variant="compact" />
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
            >
              保存并关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
