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
  Heart,
  Club,
  Diamond,
} from 'lucide-react';

export const CHUDADI_ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-chudadi',
    name: '♠️ 锄大地 · 经典 4 人桌',
    tag: '底分 1,000 积分 · 首出方块3 · 关门双倍/三倍暴击',
    baseScore: 1000,
    entryMin: 100,
    maxMultiplier: 128,
    colorTheme: 'from-emerald-600 via-teal-800 to-slate-950',
    badge: '正宗无牌官',
    mode: 'classic',
  },
  {
    id: 'room-yansan',
    name: '🔥 烟三 · 专场爆分竞技',
    tag: '底分 2,000 积分 · 烟三特色组合 · 疯狂拼分火爆开打',
    baseScore: 2000,
    entryMin: 2000,
    maxMultiplier: 256,
    colorTheme: 'from-amber-600 via-red-800 to-slate-950',
    badge: '烟三热血场',
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
  onLogout,
}) => {
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFreeBeansModal, setShowFreeBeansModal] = useState(false);

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

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-4 select-none bg-gradient-to-br from-[#080d1a] via-[#0b172a] to-[#040812] text-white relative overflow-hidden">
      {/* Ambient Radial Lights */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(16,185,129,0.15)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Profile Header & Currency */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Avatar Box */}
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md pl-1 pr-3 py-1 rounded-full border border-emerald-500/40 shadow-lg">
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

          {/* 积分 Capsule */}
          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md pl-2.5 pr-1 py-1 rounded-full border border-yellow-500/50 shadow-md">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-slate-950 font-black text-[11px] shadow">
              分
            </div>
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm pr-1">
              {userProfile.coins.toLocaleString()}
            </span>
            <button
              onClick={() => setShowFreeBeansModal(true)}
              className="w-5 h-5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 flex items-center justify-center text-slate-950 font-black cursor-pointer shadow active:scale-95 transition-transform"
              title="免费增加积分"
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
          {/* Account Login / Register / Logout Button */}
          {currentUser ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenAuth('LOGIN');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold text-xs border border-emerald-500/40 cursor-pointer shadow transition-all"
              title={`已登录账号: ${currentUser.phone} (点击切换)`}
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
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-bold text-xs shadow cursor-pointer transition-all border border-emerald-400/40"
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
            <span>福利积分</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="p-2 rounded-full bg-black/40 border border-slate-700/80 hover:bg-slate-800/80 text-amber-300 text-xs font-bold transition-all cursor-pointer shadow"
            title="规则宝典"
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

      {/* CENTER HERO & TWO GAME SECTIONS */}
      <div className="relative z-10 my-auto py-2">
        <div className="text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold mb-1.5 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>♠️ 经典 4 人桌对局 · 点数 2 最大 · 关门双倍暴击</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 bg-clip-text text-transparent drop-shadow-xl tracking-widest flex items-center justify-center gap-2">
            <span>♠️ 锄大地</span>
          </h1>
        </div>

        {/* TWO GAME SECTIONS: 锄大地 & 烟三 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto px-2">
          {CHUDADI_ROOM_PRESETS.map((room, idx) => {
            const canEnter = userProfile.coins >= room.entryMin;
            const isChudadi = room.id === 'room-chudadi';

            return (
              <div
                key={room.id}
                onClick={() => {
                  if (canEnter) {
                    sounds.playClick();
                    onSelectRoom(room);
                  } else {
                    sounds.playPass();
                    alert(`进入【${room.name}】需要至少 ${room.entryMin.toLocaleString()} 积分！`);
                  }
                }}
                className={`relative rounded-3xl p-5 border-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden shadow-2xl group ${
                  canEnter
                    ? isChudadi
                      ? 'bg-gradient-to-br from-emerald-950/90 via-slate-900/90 to-slate-950/95 border-emerald-500/60 hover:border-amber-400 hover:-translate-y-2 hover:shadow-emerald-500/25'
                      : 'bg-gradient-to-br from-amber-950/90 via-slate-900/90 to-slate-950/95 border-amber-500/60 hover:border-amber-300 hover:-translate-y-2 hover:shadow-amber-500/25'
                    : 'bg-slate-950/60 opacity-60 border-slate-800'
                }`}
              >
                {/* Decorative Background Symbol */}
                <div className="absolute -right-4 -bottom-4 opacity-10 font-black text-8xl pointer-events-none select-none text-white">
                  {isChudadi ? '♠️' : '🔥'}
                </div>

                {/* Top Badge & Score */}
                <div className="flex items-center justify-between z-10">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full shadow ${
                      isChudadi
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-300 text-slate-950'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                    }`}
                  >
                    {room.badge}
                  </span>
                  <span className="text-xs font-mono font-black text-amber-300 bg-black/40 px-2.5 py-1 rounded-full border border-amber-500/30">
                    底分 {room.baseScore.toLocaleString()} 积分
                  </span>
                </div>

                {/* Card Title & Desc */}
                <div className="my-4 sm:my-6 z-10">
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-200 group-hover:text-white transition-colors flex items-center gap-2">
                    <span>{room.name}</span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {room.tag}
                  </p>
                </div>

                {/* Action & Entry Button */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between z-10">
                  <div className="text-xs text-slate-400 font-mono">
                    准入要求: <span className="text-amber-300 font-black">{room.entryMin.toLocaleString()}</span> 积分
                  </div>

                  <button
                    disabled={!canEnter}
                    className={`px-5 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                      canEnter
                        ? isChudadi
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-lg group-hover:scale-105'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg group-hover:scale-105'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>立即开局</span>
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
          <span>正在在线匹配 4 人对局桌 (绿色公平竞技)</span>
        </div>
        <div className="flex items-center gap-3">
          <span>当前版本: v2.6.0 PWA</span>
          <span>语音对讲已就绪</span>
        </div>
      </div>

      {/* 规则宝典 Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl max-w-md w-full p-5 shadow-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
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
                <h4 className="font-bold text-amber-400 mb-1">3. 烟三特色与积分关门结算</h4>
                <p>• 先清空 13 张手牌的玩家胜出获得最大积分！</p>
                <p>• 剩 10~12 张牌：触发 <strong className="text-rose-400">双倍惩罚 (张数x2)</strong>。</p>
                <p>• 剩 13 张未出一张：触发 <strong className="text-rose-500 font-bold">三倍关门暴击 (39倍底分)</strong>！</p>
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
