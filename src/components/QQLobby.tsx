import React, { useState } from 'react';
import { RoomConfig, UserProfile } from '../types/game';
import { sounds } from '../utils/audio';
import {
  Flame,
  Trophy,
  Zap,
  Gift,
  BookOpen,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Crown,
  Coins,
  Gem,
  Plus,
  Play,
  Settings,
  X,
  Mail,
  UserCheck,
  Radio,
  Check,
  Smartphone,
} from 'lucide-react';

export const QQ_ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-novice',
    name: '初级场 · 新手试炼',
    tag: '底分 100 豆 · 封顶 x32',
    baseScore: 100,
    entryMin: 100,
    maxMultiplier: 32,
    colorTheme: 'from-emerald-600 via-teal-700 to-emerald-950',
    badge: '新手练手',
  },
  {
    id: 'room-intermediate',
    name: '中级场 · 运筹帷幄',
    tag: '底分 500 豆 · 封顶 x64',
    baseScore: 500,
    entryMin: 1000,
    maxMultiplier: 64,
    colorTheme: 'from-blue-600 via-indigo-700 to-blue-950',
    badge: '高手进阶',
  },
  {
    id: 'room-advanced',
    name: '高级场 · 巅峰争霸',
    tag: '底分 2000 豆 · 封顶 x128',
    baseScore: 2000,
    entryMin: 5000,
    maxMultiplier: 128,
    colorTheme: 'from-amber-600 via-orange-700 to-amber-950',
    badge: '大师对决',
  },
  {
    id: 'room-master',
    name: '至尊场 · 神仙斗法',
    tag: '底分 5000 豆 · 封顶 x256',
    baseScore: 5000,
    entryMin: 20000,
    maxMultiplier: 256,
    colorTheme: 'from-purple-600 via-rose-700 to-purple-950',
    badge: '土豪专属',
  },
  {
    id: 'room-no-shuffle-novice',
    name: '不洗牌初级 · 连炸新手',
    tag: '底分 300 豆 · 封顶 x128',
    baseScore: 300,
    entryMin: 500,
    maxMultiplier: 128,
    colorTheme: 'from-teal-600 via-emerald-700 to-cyan-950',
    isNoShuffle: true,
    badge: '连炸初级',
  },
  {
    id: 'room-no-shuffle',
    name: '不洗牌狂欢 · 炸弹风暴',
    tag: '底分 1000 豆 · 封顶 x256',
    baseScore: 1000,
    entryMin: 2000,
    maxMultiplier: 256,
    colorTheme: 'from-orange-600 via-amber-700 to-red-950',
    isNoShuffle: true,
    badge: '疯狂连炸',
  },
  {
    id: 'room-no-shuffle-advanced',
    name: '不洗牌高级 · 满屏轰炸',
    tag: '底分 3000 豆 · 封顶 x512',
    baseScore: 3000,
    entryMin: 8000,
    maxMultiplier: 512,
    colorTheme: 'from-rose-600 via-red-700 to-purple-950',
    isNoShuffle: true,
    badge: '核弹齐飞',
  },
  {
    id: 'room-no-shuffle-master',
    name: '不洗牌至尊 · 毁灭连环',
    tag: '底分 10000 豆 · 封顶 x1024',
    baseScore: 10000,
    entryMin: 30000,
    maxMultiplier: 1024,
    colorTheme: 'from-purple-600 via-fuchsia-800 to-rose-950',
    isNoShuffle: true,
    badge: '毁灭连环',
  },
];

interface QQLobbyProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onEnterRoom: (room: RoomConfig) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const QQLobby: React.FC<QQLobbyProps> = ({
  userProfile,
  onUpdateProfile,
  onEnterRoom,
  soundEnabled,
  onToggleSound,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'CLASSIC' | 'NO_SHUFFLE' | 'RANK'>('CLASSIC');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFreeBeansModal, setShowFreeBeansModal] = useState(false);
  const [checkinReward, setCheckinReward] = useState<number | null>(null);

  // Daily checkin handler
  const handleDailyCheckin = () => {
    sounds.playClick();
    if (userProfile.hasCheckedInToday) {
      setShowCheckinModal(true);
      return;
    }
    const reward = 3000;
    sounds.playCoins();
    setCheckinReward(reward);
    setShowCheckinModal(true);
    onUpdateProfile({
      ...userProfile,
      coins: userProfile.coins + reward,
      hasCheckedInToday: true,
    });
  };

  // Claim free beans
  const handleClaimFreeBeans = () => {
    sounds.playCoins();
    onUpdateProfile({
      ...userProfile,
      coins: userProfile.coins + 5000,
    });
    setShowFreeBeansModal(false);
  };

  const winRate =
    userProfile.wins + userProfile.losses === 0
      ? 100
      : Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100);

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-4 select-none bg-gradient-to-br from-[#0c2444] via-[#09182d] to-[#040e1c] text-white relative overflow-hidden">
      {/* Background Ambience: QQ Festive Gold Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(37,99,235,0.22)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================================
          TOP BAR (手机QQ斗地主经典顶部栏: 个人头像/欢乐豆条/钻石条/签到/邮件/设置)
          ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-1 py-1">
        {/* Left: Avatar & Currency Capsules */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* QQ Avatar Box */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-amber-500/40 shadow-lg">
            <div className="relative">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-lg sm:text-xl">
                  {userProfile.avatar}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-white shadow ring-1 ring-white/30">
                VIP3
              </span>
            </div>

            <div className="leading-tight">
              <div className="font-black text-xs sm:text-sm text-amber-200 truncate max-w-[100px] sm:max-w-[130px]">
                {userProfile.nickname}
              </div>
              <div className="text-[10px] text-amber-400/80 font-mono flex items-center gap-1">
                <span>{userProfile.title}</span>
                <span className="text-white/40">•</span>
                <span className="text-emerald-300 font-bold">{winRate}%胜</span>
              </div>
            </div>
          </div>

          {/* 欢乐豆 Capsule */}
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md pl-2.5 pr-1 py-1 rounded-full border border-yellow-500/50 shadow-md">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 font-black text-[11px] shadow">
              豆
            </div>
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm pr-1">
              {userProfile.coins.toLocaleString()}
            </span>
            <button
              onClick={() => setShowFreeBeansModal(true)}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 flex items-center justify-center text-slate-950 font-black cursor-pointer shadow active:scale-95 transition-transform"
              title="领免费欢乐豆"
            >
              <Plus className="w-3 h-3 text-white" />
            </button>
          </div>

          {/* 钻石 Capsule */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/50 backdrop-blur-md pl-2.5 pr-1 py-1 rounded-full border border-cyan-500/50 shadow-md">
            <Gem className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
            <span className="font-mono font-black text-cyan-300 text-xs pr-1">
              {userProfile.diamonds.toLocaleString()}
            </span>
            <button
              onClick={() => {
                sounds.playCoins();
                onUpdateProfile({ ...userProfile, diamonds: userProfile.diamonds + 50 });
              }}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-400 hover:brightness-110 flex items-center justify-center text-white cursor-pointer shadow active:scale-95"
              title="充能钻石"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Feature Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Daily Gift Button */}
          <button
            onClick={handleDailyCheckin}
            className="relative flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
          >
            <Gift className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">福利送豆</span>
            {!userProfile.hasCheckedInToday && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {/* Rulebook */}
          <button
            onClick={() => {
              sounds.playClick();
              setShowRuleModal(true);
            }}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs cursor-pointer transition-colors shadow"
            title="规则宝典"
          >
            <BookOpen className="w-4 h-4 text-indigo-300" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-full border text-xs cursor-pointer shadow transition-all ${
              soundEnabled
                ? 'bg-emerald-950/80 border-emerald-600/80 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundEnabled ? '静音' : '开音效'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs cursor-pointer"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          CENTER ARENA (经典横向大卡片模式选择: 经典三人斗地主 / 不洗牌模式 / 排位赛)
          ========================================================================= */}
      <div className="relative z-10 flex-1 flex flex-col justify-center my-1 sm:my-2 px-1">
        {/* Mode Tabs (经典三人 / 不洗牌狂欢) */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                sounds.playClick();
                setSelectedCategory('CLASSIC');
              }}
              className={`px-3.5 sm:px-5 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'CLASSIC'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>经典场</span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                setSelectedCategory('NO_SHUFFLE');
              }}
              className={`px-3.5 sm:px-5 py-1.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'NO_SHUFFLE'
                  ? 'bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-lg shadow-red-600/30'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>不洗牌连炸</span>
            </button>
          </div>

          <div className="text-[11px] text-amber-300/80 font-bold hidden md:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>正宗QQ斗地主规则 · 抢地主加倍 · 极速匹配</span>
          </div>
        </div>

        {/* Room Cards Row: Responsive horizontal scrollable or grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 overflow-y-auto max-h-[58vh] sm:max-h-none py-1">
          {QQ_ROOM_PRESETS.filter(r =>
            selectedCategory === 'NO_SHUFFLE' ? r.isNoShuffle : !r.isNoShuffle
          ).map((room, idx) => {
            const canEnter = userProfile.coins >= room.entryMin;
            return (
              <div
                key={room.id}
                onClick={() => {
                  if (canEnter) {
                    sounds.playClick();
                    onEnterRoom(room);
                  } else {
                    sounds.playPass();
                    setShowFreeBeansModal(true);
                  }
                }}
                className={`relative rounded-2xl sm:rounded-3xl bg-gradient-to-b ${room.colorTheme} border-2 border-amber-400/40 p-3 sm:p-4 shadow-xl flex flex-col justify-between h-36 sm:h-48 cursor-pointer transition-all duration-200 group hover:scale-[1.03] hover:shadow-2xl hover:border-yellow-300 active:scale-95 overflow-hidden ${
                  !canEnter ? 'opacity-70' : ''
                }`}
              >
                {/* Decorative Poker Watermark */}
                <div className="absolute -right-3 -bottom-3 text-6xl sm:text-7xl font-black text-white/5 pointer-events-none select-none">
                  {idx % 2 === 0 ? '♠' : '♥'}
                </div>

                {/* Top Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-black/40 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
                    {room.badge}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-white/90 font-mono">
                    封顶 x{room.maxMultiplier}
                  </span>
                </div>

                {/* Card Title & Slogan */}
                <div className="my-auto">
                  <h4 className="text-sm sm:text-lg font-black text-white group-hover:text-yellow-300 transition-colors drop-shadow">
                    {room.name.split('·')[0]}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-white/80 font-medium mt-0.5">
                    {room.tag}
                  </p>
                </div>

                {/* Bottom Entry Min Pill */}
                <div className="flex items-center justify-between bg-black/40 rounded-xl px-2.5 py-1 text-[11px] sm:text-xs text-white/90 border border-white/10 font-mono">
                  <span>准入:</span>
                  <strong className={canEnter ? 'text-amber-300 font-bold' : 'text-red-400'}>
                    {room.entryMin.toLocaleString()} 豆
                  </strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          BOTTOM BAR (手机QQ斗地主经典底部栏: 角色/商城 + 巨型金色【快速开始】按钮)
          ========================================================================= */}
      <div className="relative z-10 flex items-center justify-between gap-3 pt-1 border-t border-white/10">
        {/* Left Sub-buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowRuleModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700/80 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">玩法规则</span>
          </button>

          <button
            onClick={handleDailyCheckin}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700/80 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">福利中心</span>
          </button>
        </div>

        {/* Center-Right: Iconic Giant Golden [快速开始] Button */}
        <button
          onClick={() => {
            sounds.playClick();
            // Automatically enter the appropriate room based on coins
            const eligibleRooms = QQ_ROOM_PRESETS.filter(r => userProfile.coins >= r.entryMin);
            const targetRoom = eligibleRooms[eligibleRooms.length - 1] || QQ_ROOM_PRESETS[0];
            onEnterRoom(targetRoom);
          }}
          className="relative px-8 sm:px-12 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 text-slate-950 font-black text-sm sm:text-base shadow-2xl shadow-amber-500/50 border-2 border-yellow-200 transition-all cursor-pointer active:scale-95 flex items-center gap-2 group animate-pulse"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>快速开始</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Right Info */}
        <div className="text-[11px] text-white/50 hidden md:block">
          QQ经典对战 · 随时畅玩
        </div>
      </div>

      {/* =========================================================================
          MODALS: 规则手册、领豆福利、系统设置
          ========================================================================= */}

      {/* 规则手册 Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-amber-300 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                手机QQ斗地主 · 正宗规则手册
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-300 block font-bold">1. 叫地主与抢地主流程</strong>
                <p>• 随机 1 名玩家首叫，可选择【叫地主】或【不叫】。</p>
                <p>• 有人叫地主后，其他玩家可依次选择【抢地主 (x2)】或【不抢】。</p>
                <p>• 产生地主后，亮出 3 张底牌并归地主所有（地主拥有 20 张手牌）。</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-300 block font-bold">2. 加倍与超级加倍</strong>
                <p>• 地主与农民均可在出牌前选择【加倍 (x2)】或【不加倍】，地主可【超级加倍 (x4)】！</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-300 block font-bold">3. 牌型与压牌判定</strong>
                <p>• 单张、对子、三带一/二、顺子（≥5张单牌）、连对（≥3对）、飞机带翅膀、四带二。</p>
                <p>• <strong>炸弹 (4张同点数)</strong>：压制非炸弹牌型，倍数 x2。</p>
                <p>• <strong>王炸 (大王+小王)</strong>：最大牌型，压制一切，倍数 x4。</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-300 block font-bold">4. 春天与反春天 (倍数 x2)</strong>
                <p>• <strong>春天</strong>：地主出完牌，两位农民一张未出。</p>
                <p>• <strong>反春天</strong>：地主只出一手牌，由农民打完。</p>
              </div>
            </div>

            <button
              onClick={() => setShowRuleModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 免费领豆 Modal */}
      {showFreeBeansModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/40 animate-bounce">
              💰
            </div>

            <div>
              <h3 className="text-xl font-black text-white">破产补助 / 免费领豆</h3>
              <p className="text-xs text-slate-400 mt-1">
                欢乐豆不够用了？立即领取系统免费发放的救济豆豆！
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-black font-mono text-lg flex items-center gap-2">
              <Coins className="w-6 h-6 text-amber-400" />
              <span>+5,000 欢乐豆</span>
            </div>

            <button
              onClick={handleClaimFreeBeans}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/30 cursor-pointer active:scale-95"
            >
              立即领取
            </button>
          </div>
        </div>
      )}

      {/* 签到奖励 Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center text-3xl shadow-xl shadow-amber-500/40 animate-bounce">
              🎁
            </div>

            <div>
              <h3 className="text-xl font-black text-white">
                {checkinReward ? '签到成功！' : '今日已签到'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {checkinReward
                  ? `恭喜获得每日大礼包 +${checkinReward} 欢乐豆！`
                  : '您今天已经领过福利啦，明天记得再来领豆哦！'}
              </p>
            </div>

            <button
              onClick={() => {
                setShowCheckinModal(false);
                setCheckinReward(null);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-sm cursor-pointer"
            >
              太棒了
            </button>
          </div>
        </div>
      )}

      {/* 系统设置 Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                游戏系统设置
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
                <span>出牌音效开关</span>
                <button
                  onClick={onToggleSound}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                    soundEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {soundEnabled ? '开启' : '关闭'}
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span>屏幕横屏显示</span>
                <span className="text-amber-400 font-bold">手机QQ经典横屏 (已启用)</span>
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
