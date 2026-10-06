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
  CheckCircle2,
  X,
  Shuffle,
  Users,
  Settings,
  HelpCircle,
  Play
} from 'lucide-react';

export const ROOM_PRESETS: RoomConfig[] = [
  {
    id: 'room-novice',
    name: '初级场 · 新手试炼',
    tag: '新手练手',
    baseScore: 100,
    entryMin: 100,
    maxMultiplier: 32,
    colorTheme: 'from-emerald-700 to-teal-900',
    badge: '🥉 初级',
  },
  {
    id: 'room-intermediate',
    name: '中级场 · 运筹帷幄',
    tag: '高手对决',
    baseScore: 500,
    entryMin: 1000,
    maxMultiplier: 64,
    colorTheme: 'from-blue-700 to-indigo-900',
    badge: '🥈 中级',
  },
  {
    id: 'room-advanced',
    name: '高级场 · 巅峰争霸',
    tag: '刺激高倍',
    baseScore: 2000,
    entryMin: 5000,
    maxMultiplier: 128,
    colorTheme: 'from-amber-700 to-orange-950',
    badge: '🥇 高级',
  },
  {
    id: 'room-master',
    name: '至尊场 · 神仙斗法',
    tag: '土豪专属',
    baseScore: 5000,
    entryMin: 20000,
    maxMultiplier: 256,
    colorTheme: 'from-purple-800 to-rose-950',
    badge: '👑 至尊',
  },
  {
    id: 'room-no-shuffle',
    name: '不洗牌场 · 炸弹狂欢',
    tag: '连对顺子满天飞',
    baseScore: 1000,
    entryMin: 2000,
    maxMultiplier: 512,
    colorTheme: 'from-red-700 via-rose-900 to-amber-950',
    isNoShuffle: true,
    badge: '⚡ 不洗牌',
  },
];

interface GameLobbyProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onEnterRoom: (room: RoomConfig) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  userProfile,
  onUpdateProfile,
  onEnterRoom,
  soundEnabled,
  onToggleSound,
}) => {
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinReward, setCheckinReward] = useState<number | null>(null);

  // Daily checkin handler
  const handleDailyCheckin = () => {
    sounds.playClick();
    if (userProfile.hasCheckedInToday) {
      setShowCheckinModal(true);
      return;
    }
    const reward = 2000;
    sounds.playCoins();
    setCheckinReward(reward);
    setShowCheckinModal(true);
    onUpdateProfile({
      ...userProfile,
      coins: userProfile.coins + reward,
      hasCheckedInToday: true,
    });
  };

  const winRate =
    userProfile.wins + userProfile.losses === 0
      ? 100
      : Math.round((userProfile.wins / (userProfile.wins + userProfile.losses)) * 100);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-5 py-2 sm:py-4 px-2 sm:px-4">
      {/* Lobby Top Profile Bar */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-amber-500/30 p-3.5 sm:p-5 shadow-2xl overflow-hidden flex flex-wrap items-center justify-between gap-4">
        {/* User Card */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl sm:text-3xl">
                🤠
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 shadow">
              VIP 1
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-slate-100">
                {userProfile.nickname}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                {userProfile.title}
              </span>
            </div>

            {/* Coins Counter */}
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-black font-mono text-xs sm:text-sm shadow-inner">
                <Coins className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{userProfile.coins.toLocaleString()} 豆</span>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                战绩: {userProfile.wins}胜 / {userProfile.losses}负 (胜率 {winRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Lobby Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleDailyCheckin}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/30 transition-all cursor-pointer active:scale-95"
          >
            <Gift className="w-4 h-4" />
            <span>{userProfile.hasCheckedInToday ? '已签到' : '领豆福利'}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setShowRuleModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>规则宝典</span>
          </button>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? '音效开启' : '音效静音'}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Hero Quick Play Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-emerald-950 border-2 border-emerald-500/40 p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="absolute right-0 top-0 w-96 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(52,211,153,0.18),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>正宗斗地主 · 抢地主加倍 · 春天反春天</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            经典三人斗地主 · 局域网/公网即开即战
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200/80 max-w-xl leading-relaxed">
            叫地主、抢地主、超高加倍，更有超刺激不洗牌炸弹狂欢场！智能高段位 AI 陪练，随时随地开局！
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onEnterRoom(ROOM_PRESETS[0]);
          }}
          className="relative z-10 flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-base shadow-2xl shadow-amber-500/40 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>快速开局 (新手场)</span>
        </button>
      </div>

      {/* Room Fields Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-black text-base sm:text-lg text-slate-100 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <span>选择对战游戏场次</span>
          </h3>
          <span className="text-xs text-slate-400">点击卡片即可入场开战</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {ROOM_PRESETS.map(room => {
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
                    alert(`欢乐豆不足 ${room.entryMin}，请点击上方领豆或选择初级场！`);
                  }
                }}
                className={`relative rounded-2xl bg-gradient-to-br ${room.colorTheme} border-2 border-slate-700/60 p-4.5 shadow-xl transition-all cursor-pointer flex flex-col justify-between h-44 overflow-hidden group hover:scale-[1.02] hover:border-amber-400/80 hover:shadow-2xl active:scale-95 ${
                  !canEnter ? 'opacity-65' : ''
                }`}
              >
                {/* Background Pattern */}
                <div className="absolute -right-4 -bottom-4 text-7xl font-black text-white/5 select-none pointer-events-none font-mono">
                  ♠♦
                </div>

                {/* Top Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-black/40 text-amber-300 border border-amber-400/30 backdrop-blur-sm">
                    {room.badge}
                  </span>
                  <span className="text-[11px] font-bold text-white/80">
                    封顶 x{room.maxMultiplier}
                  </span>
                </div>

                {/* Middle Info */}
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    {room.name}
                  </h4>
                  <p className="text-xs text-white/70 mt-0.5">{room.tag}</p>
                </div>

                {/* Bottom Stats */}
                <div className="flex items-center justify-between border-t border-white/10 pt-2 text-xs text-white/90">
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-white/60">底分:</span>
                    <strong className="text-amber-300">{room.baseScore} 豆</strong>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-white/60">准入:</span>
                    <strong className={canEnter ? 'text-emerald-300' : 'text-red-300'}>
                      {room.entryMin} 豆
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rules Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-indigo-500 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                斗地主规则宝典与牌型说明
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-400 block font-bold">1. 叫地主与抢地主流程</strong>
                <p>• 随机一人先手选择【叫地主】或【不叫】。</p>
                <p>• 有人叫地主后，其他玩家可依次选择【抢地主 (倍数 x2)】或【不抢】。</p>
                <p>• 每次抢地主都会让底分翻倍！产生最终地主后亮出3张底牌并归地主所有。</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-400 block font-bold">2. 加倍阶段</strong>
                <p>• 地主与两位农民均可选择【加倍 (x2)】或【不加倍】，地主可发起【超级加倍 (x4)】！</p>
                <p>• 各玩家的加倍将在最终结算时按各自倍数计算得分。</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-400 block font-bold">3. 牌型与大小规则</strong>
                <p>• <strong>单张/对子/三张/三带一/三带对</strong>：点数 3 至 大小王。</p>
                <p>• <strong>顺子</strong>：五张或以上连续单牌（不得含 2 和 大小王）。</p>
                <p>• <strong>连对</strong>：三对或以上连续对牌（如 334455，不得含 2 和 大小王）。</p>
                <p>• <strong>飞机带翅膀</strong>：两个或以上连续三张 + 等量单牌或对牌。</p>
                <p>• <strong>炸弹 (四张同点)</strong>：压过除王炸外的任意牌型，倍数 x2。</p>
                <p>• <strong>王炸 (双王)</strong>：天下最大，压制一切牌型，倍数 x4。</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <strong className="text-amber-400 block font-bold">4. 春天与反春天 (倍数再 x2)</strong>
                <p>• <strong>春天</strong>：地主出完手牌，两位农民一张牌未出。</p>
                <p>• <strong>反春天</strong>：地主只出过一手牌，由农民打完手牌。</p>
              </div>
            </div>

            <button
              onClick={() => setShowRuleModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm cursor-pointer transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Checkin Reward Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
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
                  ? `恭喜获得每日豪礼 +${checkinReward} 欢乐豆！`
                  : '您今天已经领过福利啦，明天记得再来领豆哦！'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 font-black font-mono text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <span>当前余额: {userProfile.coins.toLocaleString()} 豆</span>
            </div>

            <button
              onClick={() => {
                setShowCheckinModal(false);
                setCheckinReward(null);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm cursor-pointer"
            >
              太棒了
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
