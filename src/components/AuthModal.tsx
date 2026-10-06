import React, { useState, useEffect } from 'react';
import { authStore, UserAccount } from '../utils/authStore';
import { sounds } from '../utils/audio';
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 relative flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 p-4 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg text-slate-950 font-black">
              <ShieldCheck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-lg text-emerald-200 flex items-center gap-1.5">
                <span>锄大地账号系统</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  TG Bot 授权防护
                </span>
              </h3>
              <p className="text-[11px] text-emerald-400/80">
                支持 Telegram Bot 授权注册与 6位密码登录
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => {
              sounds.playClick();
              setActiveTab('LOGIN');
              setErrorMsg('');
            }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'LOGIN'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
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
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'REGISTER'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>新用户注册 (需要 TG 授权)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-start gap-2 shadow-lg animate-pulse">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="leading-tight font-medium">{errorMsg}</div>
            </div>
          )}

          {activeTab === 'REGISTER' ? (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* TG Authorized Phone Requirement Notice */}
              <div className="p-2.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300/90 flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <b>授权规则：</b>仅 Telegram Bot 授权的手机号可进行注册。无需真实的短信验证码。
                </span>
              </div>

              {/* Phone Input with TG Check Button */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    授权手机号
                  </span>
                  <span className="text-[10px] text-slate-400">例: 13800138000</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="输入手机号"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCheckPhone(phone)}
                    disabled={isCheckingPhone || !phone}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 cursor-pointer disabled:opacity-50 transition-all shrink-0 flex items-center gap-1"
                  >
                    {isCheckingPhone ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>检查授权</span>
                  </button>
                </div>

                {/* Phone Authorization Status Badge */}
                {phoneAuthStatus.checked && (
                  <div className="mt-1.5">
                    {phoneAuthStatus.isAuthorized ? (
                      <div className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{phoneAuthStatus.message}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-red-300 bg-red-950/60 border border-red-500/40 rounded-xl px-2.5 py-1 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>
                          ❌ 未获授权！请在 Telegram Bot 中发送命令{' '}
                          <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">
                            /auth {phone || '手机号'}
                          </code>{' '}
                          完成授权后再试。
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Nickname Input */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-amber-400" />
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              {/* Password Input (Must be exactly 6 characters) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    登录密码 (6位字母或数字)
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      password.length === 6
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {password.length}/6位
                  </span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="设置 6 位数密码 (不限大小写)"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono tracking-widest"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  确认密码
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="再次输入 6 位数密码"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none font-mono tracking-widest"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  选择形象头像
                </label>
                <div className="grid grid-cols-5 gap-1.5 bg-slate-950/80 p-2 rounded-2xl border border-slate-800">
                  {AVATAR_OPTIONS.map(av => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setSelectedAvatar(av);
                      }}
                      className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        selectedAvatar === av
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-md ring-2 ring-white text-slate-950 scale-105'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {av}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 font-black text-sm text-slate-950 shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2 mt-2"
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
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
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    登录密码 (6位数)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">6 位数不限大小写</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="输入 6 位密码"
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none font-mono tracking-widest"
                />
              </div>

              {/* Quick Demo Credentials */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 flex items-center justify-between">
                  <span>💡 快速测试账号：</span>
                  <span>点击自动填入</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount('13800138000', 'admin8')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                      <span>👑 锄神大司马</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      13800138000 / admin8
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount('18888888888', '123456')}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <span>⭐ 赌圣阿星</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      18888888888 / 123456
                    </div>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 font-black text-sm text-slate-950 shadow-lg cursor-pointer transition-all active:scale-98 flex items-center justify-center gap-2"
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
        <div className="bg-slate-950 p-3 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between px-4">
          <span className="flex items-center gap-1 text-slate-400">
            <HelpCircle className="w-3 h-3 text-emerald-400" />
            没有授权？在 TG Bot 中输入 <code className="text-emerald-300">/auth 手机号</code> 授权
          </span>
          <span className="text-slate-500 font-mono">v2.5 TG Edition</span>
        </div>
      </div>
    </div>
  );
};
