import React, { useState, useEffect } from 'react';
import { authStore, UserAccount } from '../utils/authStore';
import { sounds } from '../utils/audio';
import { useAppTheme } from '../utils/themeContext';
import {
  ShieldCheck,
  UserPlus,
  LogIn,
  Phone,
  Lock,
  User,
  Sparkles,
  X,
  AlertCircle,
  CheckCircle2,
  Bot,
  KeyRound,
  HelpCircle,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  initialTab?: 'LOGIN' | 'REGISTER';
}

const AVATAR_OPTIONS = ['😎', '👑', '🤠', '🧙‍♂️', '🧐', '🐯', '🔥', '🐱', '🤖', '🦊'];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'LOGIN',
}) => {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>(initialTab);

  // Form states
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('😎');

  // TG Authorization status check state
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [phoneAuthStatus, setPhoneAuthStatus] = useState<{
    checked: boolean;
    isAuthorized: boolean;
    isRegistered: boolean;
    message: string;
  }>({
    checked: false,
    isAuthorized: false,
    isRegistered: false,
    message: '',
  });

  // UI state
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    setErrorMsg('');
  }, [initialTab, isOpen]);

  if (!isOpen) return null;

  // Real-time phone TG authorization check
  const handleCheckPhone = async (phoneVal: string) => {
    if (!phoneVal.trim()) {
      setPhoneAuthStatus({
        checked: false,
        isAuthorized: false,
        isRegistered: false,
        message: '',
      });
      return;
    }

    setIsCheckingPhone(true);
    const result = await authStore.checkPhoneAuthorized(phoneVal.trim());
    setIsCheckingPhone(false);

    setPhoneAuthStatus({
      checked: true,
      isAuthorized: result.isAuthorized,
      isRegistered: result.isRegistered,
      message: result.message,
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, ''); // numbers only for clean phone
    setPhone(val);
    if (phoneAuthStatus.checked) {
      setPhoneAuthStatus(prev => ({ ...prev, checked: false }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setErrorMsg('');
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setErrorMsg('');

    if (!phone.trim()) {
      setErrorMsg('请输入手机号');
      return;
    }

    if (!nickname.trim()) {
      setErrorMsg('请输入游戏昵称');
      return;
    }

    if (password.length !== 6) {
      setErrorMsg('密码必须恰好为 6 位数 (不限大小写字母或数字)');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('两次输入的密码不一致，请核对');
      return;
    }

    setLoading(true);
    const res = await authStore.register(phone, nickname, password, selectedAvatar);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || '注册失败');
      sounds.playClick();
    } else if (res.user) {
      sounds.playCoins();
      onSuccess(res.user);
      onClose();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    setErrorMsg('');

    if (!phone.trim()) {
      setErrorMsg('请输入手机号或昵称');
      return;
    }

    if (password.length !== 6) {
      setErrorMsg('密码为 6 位数');
      return;
    }

    setLoading(true);
    const res = await authStore.login(phone, password);
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || '登录失败');
      sounds.playClick();
    } else if (res.user) {
      sounds.playCoins();
      onSuccess(res.user);
      onClose();
    }
  };

  const fillDemoAccount = (demoPhone: string, demoPwd: string) => {
    sounds.playClick();
    setPhone(demoPhone);
    setPassword(demoPwd);
    setErrorMsg('');
  };

  const { theme } = useAppTheme();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div 
        className={`border-2 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh] transition-colors ${
          theme === 'deep-green'
            ? 'bg-[#145339] border-emerald-400/70 text-emerald-50'
            : 'bg-[#144f75] border-cyan-400/70 text-cyan-50'
        }`}
      >
        {/* Top Header */}
        <div 
          className={`p-3 sm:p-4 border-b flex items-center justify-between shrink-0 ${
            theme === 'deep-green'
              ? 'bg-[#0e3b28]/95 border-emerald-400/30'
              : 'bg-[#0e3752]/95 border-cyan-400/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg text-slate-950 font-black shrink-0">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-amber-300 flex items-center gap-1.5">
                <span>锄大地账号系统</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  TG Bot 授权防护
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-white/80">
                支持 Telegram Bot 授权注册与 6位密码登录
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div 
          className={`flex border-b p-1 shrink-0 ${
            theme === 'deep-green'
              ? 'bg-[#0a2e1f]/90 border-emerald-400/20'
              : 'bg-[#0a2b40]/90 border-cyan-400/20'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('LOGIN');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>账号登录</span>
          </button>

          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('REGISTER');
              setErrorMsg('');
            }}
            className={`flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 shadow font-black'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>新用户注册 (需要 TG 授权)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 flex-1 min-h-0 custom-scrollbar">
          {errorMsg && (
            <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 shadow-lg animate-pulse">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{errorMsg}</div>
            </div>
          )}

          {activeTab === 'REGISTER' ? (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* TG Authorized Phone Requirement Notice */}
              <div 
                className={`p-2 rounded-xl border text-[10px] sm:text-[11px] flex items-center gap-2 ${
                  theme === 'deep-green'
                    ? 'bg-[#0e3b28]/95 border-emerald-400/40 text-emerald-100'
                    : 'bg-[#0e3752]/95 border-cyan-400/40 text-cyan-100'
                }`}
              >
                <Bot className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  <b>授权规则：</b>仅 Telegram Bot 授权的手机号可进行注册。无需真实短信验证码。
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Column 1: Phone & Nickname */}
                <div className="space-y-2.5">
                  {/* Phone Input with TG Check Button */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-300" />
                        授权手机号
                      </span>
                      <span className="text-[10px] text-white/60">例: 13800138000</span>
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          maxLength={11}
                          placeholder="输入手机号"
                          value={phone}
                          onChange={handlePhoneChange}
                          className={`w-full rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none font-mono border ${
                            theme === 'deep-green'
                              ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                              : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                          }`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCheckPhone(phone)}
                        disabled={isCheckingPhone || !phone}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-300 border cursor-pointer disabled:opacity-50 transition-all shrink-0 flex items-center gap-1 ${
                          theme === 'deep-green'
                            ? 'bg-[#0e3b28] border-emerald-400/50 hover:bg-[#155b3c]'
                            : 'bg-[#0e3752] border-cyan-400/50 hover:bg-[#155b85]'
                        }`}
                      >
                        {isCheckingPhone ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>检查授权</span>
                      </button>
                    </div>

                    {/* Phone Authorization Status Badge */}
                    {phoneAuthStatus.checked && (
                      <div className="mt-1">
                        {phoneAuthStatus.isAuthorized ? (
                          <div 
                            className={`text-[10px] rounded-lg px-2 py-0.5 flex items-center gap-1 border ${
                              theme === 'deep-green'
                                ? 'bg-[#0e3b28] border-emerald-400 text-emerald-200'
                                : 'bg-[#0e3752] border-cyan-400 text-cyan-200'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3 text-amber-300 shrink-0" />
                            <span>{phoneAuthStatus.message}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-rose-300 bg-rose-950/80 border border-rose-500/40 rounded-lg px-2 py-0.5 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                            <span>
                              ❌ 未获授权！请在 Telegram Bot 中发送{' '}
                              <code className="text-amber-300 bg-black/40 px-1 rounded">
                                /auth {phone || '手机号'}
                              </code>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nickname Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-300" />
                      游戏昵称
                    </label>
                    <input
                      type="text"
                      maxLength={12}
                      placeholder="2-12 位个性昵称 (例: 锄神小霸王)"
                      value={nickname}
                      onChange={e => {
                        setNickname(e.target.value);
                        setErrorMsg('');
                      }}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-white/40 outline-none border ${
                        theme === 'deep-green'
                          ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                          : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Column 2: Password & Avatar */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Password Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-300" />
                          6位密码
                        </span>
                        <span className="text-[9px] font-mono text-white/60">{password.length}/6位</span>
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="6位密码"
                        value={password}
                        onChange={handlePasswordChange}
                        className={`w-full rounded-xl px-2 py-1.5 text-xs text-white placeholder-white/40 outline-none font-mono tracking-wider border ${
                          theme === 'deep-green'
                            ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                            : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                        }`}
                      />
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-amber-300" />
                        确认密码
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        placeholder="再次输入"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className={`w-full rounded-xl px-2 py-1.5 text-xs text-white placeholder-white/40 outline-none font-mono tracking-wider border ${
                          theme === 'deep-green'
                            ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                            : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Avatar Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-amber-200 mb-1">
                      选择形象头像
                    </label>
                    <div 
                      className={`grid grid-cols-5 gap-1 p-1.5 rounded-2xl border ${
                        theme === 'deep-green'
                          ? 'bg-[#0e3b28]/95 border-emerald-400/30'
                          : 'bg-[#0e3752]/95 border-cyan-400/30'
                      }`}
                    >
                      {AVATAR_OPTIONS.map(av => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setSelectedAvatar(av);
                          }}
                          className={`h-8 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                            selectedAvatar === av
                              ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 shadow-md ring-2 ring-amber-300 text-slate-950 scale-105'
                              : 'bg-black/30 hover:bg-black/50 text-white'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-105 font-black text-xs sm:text-sm text-slate-950 shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2 mt-1"
              >
                {loading ? (
                  <span>正在提交注册...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-slate-950" />
                    <span>确认注册并领 30,000 积分</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-amber-300" />
                  账号 (手机号或昵称)
                </label>
                <input
                  type="text"
                  placeholder="输入授权手机号或玩家昵称"
                  value={phone}
                  onChange={e => {
                    setPhone(e.target.value);
                    setErrorMsg('');
                  }}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/40 outline-none border ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                      : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    登录密码 (6位数)
                  </span>
                  <span className="text-[10px] text-white/60 font-mono">6 位数不限大小写</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="输入 6 位密码"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs text-white placeholder-white/40 outline-none font-mono tracking-widest border ${
                    theme === 'deep-green'
                      ? 'bg-[#0e3b28]/90 border-emerald-400/40 focus:border-amber-300'
                      : 'bg-[#0e3752]/90 border-cyan-400/40 focus:border-amber-300'
                  }`}
                />
              </div>

              {/* Quick Demo Credentials */}
              <div 
                className={`p-3 rounded-2xl border space-y-2 ${
                  theme === 'deep-green'
                    ? 'bg-[#0e3b28]/95 border-emerald-400/40'
                    : 'bg-[#0e3752]/95 border-cyan-400/40'
                }`}
              >
                <div className="text-[10px] font-bold text-amber-300 flex items-center justify-between">
                  <span>💡 快速测试账号：</span>
                  <span className="text-white/60">点击自动填入</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('13800138000', 'admin8')}
                    className={`p-2 rounded-xl text-left transition-colors cursor-pointer border ${
                      theme === 'deep-green'
                        ? 'bg-[#114732] border-emerald-400/50 hover:bg-[#185e42]'
                        : 'bg-[#12476b] border-cyan-400/50 hover:bg-[#185c8a]'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <span>👑 锄神大司马</span>
                    </div>
                    <div className="text-[10px] text-white/70 font-mono mt-0.5">
                      13800138000 / admin8
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('18888888888', '123456')}
                    className={`p-2 rounded-xl text-left transition-colors cursor-pointer border ${
                      theme === 'deep-green'
                        ? 'bg-[#114732] border-emerald-400/50 hover:bg-[#185e42]'
                        : 'bg-[#12476b] border-cyan-400/50 hover:bg-[#185c8a]'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <span>⭐ 赌圣阿星</span>
                    </div>
                    <div className="text-[10px] text-white/70 font-mono mt-0.5">
                      18888888888 / 123456
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:brightness-105 font-black text-sm text-slate-950 shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>正在登录...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-slate-950" />
                    <span>立即登录游戏</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div 
          className={`p-3 border-t text-[10px] flex items-center justify-between px-4 ${
            theme === 'deep-green'
              ? 'bg-[#0a2e1f]/90 border-emerald-400/30 text-white/70'
              : 'bg-[#0a2b40]/90 border-cyan-400/30 text-white/70'
          }`}
        >
          <span className="flex items-center gap-1 text-white/80">
            <HelpCircle className="w-3 h-3 text-amber-300" />
            没有授权？在 TG Bot 中输入 <code className="text-amber-300">/auth 手机号</code> 授权
          </span>
          <span className="text-amber-300/80 font-mono">v2.5 TG Edition</span>
        </div>
      </div>
    </div>
  );
};
