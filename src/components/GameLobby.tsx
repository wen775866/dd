import React, { useState } from 'react';
import { RoomConfig, UserProfile } from '../types/game';
import { UserAccount } from '../utils/authStore';
import { sounds } from '../utils/audio';
import { voiceEngine, DIALECT_OPTIONS } from '../utils/voiceSystem';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Flame,
  Trophy,
  Zap,
  Gift,
  BookOpen,
  Volume2,
  Sparkles,
  ChevronRight,
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
  Mic,
  Award,
  Layers,
  ShieldCheck,
  LogOut,
  User,
  Bot,
} from 'lucide-react';

export const CHUDADI_ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-novice',
    name: '初级场 · 新手水之池',
    tag: '底分 100 豆 · 关门双倍',
    baseScore: 100,
    entryMin: 100,
    maxMultiplier: 32,
    colorTheme: 'from-emerald-600 via-teal-700 to-emerald-950',
    badge: '练手推荐',
    mode: 'classic',
  },
  {
    id: 'room-intermediate',
    name: '中级场 · 运筹风暴镇',
    tag: '底分 500 豆 · 关门双倍',
    baseScore: 500,
    entryMin: 2000,
    maxMultiplier: 64,
    colorTheme: 'from-blue-600 via-indigo-700 to-slate-950',
    badge: '高手进阶',
    mode: 'express',
  },
  {
    id: 'room-advanced',
    name: '高级场 · 锄神至尊殿',
    tag: '底分 2,000 豆 · 三倍关门暴击',
    baseScore: 2000,
    entryMin: 10000,
    maxMultiplier: 128,
    colorTheme: 'from-purple-600 via-indigo-900 to-slate-950',
    badge: '大佬云集',
    mode: 'master',
  },
  {
    id: 'room-god',
    name: '神圣场 · 顶峰双倍爆金',
    tag: '底分 5,000 豆 · 铁支/同花顺x4',
    baseScore: 5000,
    entryMin: 25000,
    maxMultiplier: 256,
    colorTheme: 'from-amber-600 via-orange-800 to-amber-950',
    badge: '富豪必玩',
    mode: 'master',
  },
];

interface GameLobbyProps {
  userProfile: UserProfile;
  currentUser: UserAccount | null;
  onSelectRoom: (room: RoomConfig) => void;
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
  onOpenAdmin,
  onLogout,
}) => {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFreeBeansModal, setShowFreeBeansModal] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);

  const handleDailyCheckin = () => {
    if (userProfile.hasCheckedInToday) {
      sounds.playClick();
      alert('您今天已经签到领过福利豆了，明天再来吧！');
      return;
    }
    sounds.playCoins();
    onUpdateCoins(userProfile.coins + 3000);
    alert('🎉 每日签到成功！恭喜获得 3,000 欢乐豆奖励！');
  };

  const winRate =
    userProfile.wins + userProfile.losses === 0
      ? 100
      : Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100);

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-4 select-none bg-gradient-to-br from-[#0a192f] via-[#081226] to-[#040914] text-white relative overflow-hidden">
      {/* Ambient Radial Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.18)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Profile Header & Currency */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Avatar Box */}
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-emerald-500/40 shadow-lg">
            <div className="relative">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-200 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-lg sm:text-xl">
                  {userProfile.avatar}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow ring-1 ring-white/30">
                锄神
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
              title="免费充能补豆"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          {/* 钻石 Capsule */}
          <div className="hidden md:flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full border border-cyan-500/40 shadow">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span className="font-mono font-black text-cyan-300 text-xs">
              {userProfile.diamonds}
            </span>
          </div>
        </div>

        {/* Right Feature Buttons */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* TG Bot Admin Button */}
          <button
            onClick={() => {
              sounds.playClick();
              onOpenAdmin();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-600 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-md active:scale-95 cursor-pointer transition-transform border border-amber-300/50"
            title="Telegram Bot 管理员控制台"
          >
            <Bot className="w-3.5 h-3.5 text-slate-950" />
            <span>Bot管理员</span>
          </button>

          {/* Account Login / Register / Logout Button */}
          {currentUser ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-emerald-500/40 cursor-pointer shadow transition-all"
              title={`已登录: ${currentUser.phone} (点击切换账号)`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate max-w-[80px]">{currentUser.nickname}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold text-xs shadow cursor-pointer transition-all border border-emerald-400/40"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>登录 / 注册</span>
            </button>
          )}

          <PWAInstallButton />

          <button
            onClick={handleDailyCheckin}
            className="relative hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 cursor-pointer transition-transform"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>福利签到</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-full bg-black/40 border border-slate-700/80 hover:bg-slate-800/80 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow"
            title="锄大地规则宝典"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-full bg-black/40 border border-slate-700/80 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow"
            title="系统设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER HERO & ROOM SELECTOR */}
      <div className="relative z-10 my-auto py-2">
        <div className="text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-1 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>经典 4 人大牌决战 · 2 &gt; A &gt; K ... &gt; 3 · 首出方块3</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-lg tracking-wider">
            🔨 欢聚锄大地 · 4人桌爆金赛
          </h1>
        </div>

        {/* 4 Room Presets Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto px-1">
          {CHUDADI_ROOM_PRESETS.map((room) => {
            const canEnter = userProfile.coins >= room.entryMin;
            return (
              <div
                key={room.id}
                onClick={() => {
                  if (canEnter) {
                    sounds.playClick();
                    onSelectRoom(room);
                  } else {
                    sounds.playPass();
                    alert(`需要至少 ${room.entryMin.toLocaleString()} 欢乐豆方可进入该场次！`);
                  }
                }}
                className={`relative rounded-3xl p-3 sm:p-4 border-2 transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden shadow-2xl group ${
                  canEnter
                    ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 hover:-translate-y-1.5 hover:shadow-emerald-500/20 border-emerald-500/50 hover:border-amber-400'
                    : 'bg-slate-950/60 opacity-60 border-slate-800'
                }`}
              >
                {/* Room Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow">
                    {room.badge}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-emerald-400">
                    底分 {room.baseScore}
                  </span>
                </div>

                <div className="my-3">
                  <h3 className="text-base sm:text-lg font-black text-amber-200 group-hover:text-white transition-colors">
                    {room.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{room.tag}</p>
                </div>

                {/* Entry Requirement & Action */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400">
                    准入: <span className="text-amber-300 font-mono font-bold">{room.entryMin.toLocaleString()}</span> 豆
                  </div>
                  <button
                    disabled={!canEnter}
                    className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all ${
                      canEnter
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md group-hover:scale-105'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>入场</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER */}
      <div className="relative z-10 flex items-center justify-between px-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>正在在线匹配对局房间 (公平绿色无挂)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>当前版本: v2.5.0 PWA</span>
          <span>按住对讲语音</span>
        </div>
      </div>

      {/* 规则宝典 Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-base font-black text-amber-300 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <span>锄大地 (Big Two) 玩法规则宝典</span>
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
                <h4 className="font-bold text-amber-400 mb-1">1. 基础牌值与大小规则</h4>
                <p>• 4人对局，使用 52 张标准扑克牌（无大小王），每人手牌 13 张。</p>
                <p>• 点数大小：<strong className="text-amber-300">2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 &gt; 9 &gt; 8 &gt; 7 &gt; 6 &gt; 5 &gt; 4 &gt; 3</strong>（老二最大，3最小）。</p>
                <p>• 花色大小：<strong className="text-amber-300">♠黑桃 &gt; ♥红桃 &gt; ♣草花 &gt; ♦方块</strong>。</p>
                <p>• 首局首出：持有 <strong className="text-amber-300">♦3 (方块3)</strong> 的玩家优先首出，且首出牌型中必须包含♦3。</p>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">2. 五张牌型压制层级 (由小到大)</h4>
                <p>• 1. <strong className="text-emerald-300">顺子 (Straight)</strong>: 5张连续点数。</p>
                <p>• 2. <strong className="text-emerald-300">同花 (Flush)</strong>: 5张相同花色。</p>
                <p>• 3. <strong className="text-emerald-300">葫芦 (Full House)</strong>: 三条 + 一对。</p>
                <p>• 4. <strong className="text-emerald-300">铁支 (Four of a Kind)</strong>: 四条 + 一单张。</p>
                <p>• 5. <strong className="text-emerald-300">同花顺 (Straight Flush)</strong>: 5张同花色连续点数（最高牌型）。</p>
                <p>注：高阶五张牌型可直接压制低阶五张牌型（如葫芦可直接压顺子/同花）！</p>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <h4 className="font-bold text-amber-400 mb-1">3. 跑清与双倍/三倍关门结算</h4>
                <p>• 先清空 13 张手牌的玩家获得第一名胜出！</p>
                <p>• 剩 1~9 张牌：按剩牌张数扣分。</p>
                <p>• 剩 10~12 张牌：触发 <strong className="text-rose-400">双倍惩罚 (张数x2)</strong>。</p>
                <p>• 剩 13 张未出一张：触发 <strong className="text-rose-500 font-bold">三倍关门暴击 (13x3 = 39倍底分)</strong>！</p>
                <p>• 若胜者以老二清牌倍数额外x2，以铁支/同花顺清牌倍数额外x4！</p>
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

      {/* 免费充能补豆 Modal */}
      {showFreeBeansModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl max-w-xs w-full p-5 shadow-2xl flex flex-col items-center text-center gap-3 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-300">免费补豆充能站</h3>
              <p className="text-xs text-slate-400 mt-1">资金不足？即刻领取 5,000 免费欢乐豆救救急！</p>
            </div>
            <button
              onClick={() => {
                sounds.playCoins();
                onUpdateCoins(userProfile.coins + 5000);
                setShowFreeBeansModal(false);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-black text-xs cursor-pointer shadow-lg hover:brightness-110"
            >
              领取 5,000 豆
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
                锄大地系统设置
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
                    <span>真人语音发音风格</span>
                  </span>
                  <span className="text-[10px] text-slate-400">实时配音</span>
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
                <span>PWA 独立桌面版</span>
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
