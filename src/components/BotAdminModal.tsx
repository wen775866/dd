import React, { useState, useEffect } from 'react';
import { authStore, UserAccount, BotConfig } from '../utils/authStore';
import { sounds } from '../utils/audio';
import {
  ShieldCheck,
  Bot,
  Users,
  PhoneCall,
  Terminal,
  Settings,
  Plus,
  Trash2,
  Search,
  KeyRound,
  Coins,
  CheckCircle2,
  XCircle,
  X,
  Send,
  RefreshCw,
  Copy,
  AlertCircle,
  Award,
} from 'lucide-react';

interface BotAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
}

export const BotAdminModal: React.FC<BotAdminModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'PHONES' | 'USERS' | 'SIMULATOR' | 'CONFIG'>('PHONES');

  // Data states
  const [authorizedPhones, setAuthorizedPhones] = useState<string[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [botConfig, setBotConfig] = useState<BotConfig>({
    token: '',
    botUsername: '',
    webhookUrl: '',
  });

  // Phone tab states
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');

  // User tab states
  const [userSearch, setUserSearch] = useState('');
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [editCoinVal, setEditCoinVal] = useState<number>(0);
  const [editPwdVal, setEditPwdVal] = useState<string>('');

  // Bot Simulator states
  const [simInput, setSimInput] = useState('');
  const [simMessages, setSimMessages] = useState<{ sender: 'user' | 'bot'; text: string; time: string }[]>([
    {
      sender: 'bot',
      text: '🤖 **Telegram Bot 管理器仿真控制台已就绪**\n\n可直接在下方输入 Telegram 指令测试：\n• `/auth 13912345678` 授权手机号\n• `/list` 查看已授权列表\n• `/users` 查看注册玩家',
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const [botTokenInput, setBotTokenInput] = useState('');
  const [botUsernameInput, setBotUsernameInput] = useState('');
  const [copiedMsg, setCopiedMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const data = await authStore.getAdminData();
    setAuthorizedPhones(data.authorizedPhones || []);
    setUsers(data.users || []);
    setLogs(data.logs || []);
    if (data.botConfig) {
      setBotConfig(data.botConfig);
      setBotTokenInput(data.botConfig.token || '');
      setBotUsernameInput(data.botConfig.botUsername || '');
    }
  };

  if (!isOpen) return null;

  // Add Authorized Phone
  const handleAddPhone = async () => {
    const cleanPhone = newPhoneInput.trim();
    if (!cleanPhone) return;
    sounds.playClick();
    await authStore.authorizePhone(cleanPhone);
    setNewPhoneInput('');
    loadData();
  };

  // Revoke Phone
  const handleRevokePhone = async (phoneToRevoke: string) => {
    if (!confirm(`确定要取消手机号 ${phoneToRevoke} 的注册授权吗？`)) return;
    sounds.playClick();
    await authStore.revokePhone(phoneToRevoke);
    loadData();
  };

  // Modify User Coins
  const handleSaveCoins = async (phone: string) => {
    sounds.playClick();
    await authStore.modifyUser(phone, 'UPDATE_COINS', { coins: editCoinVal });
    setEditingPhone(null);
    loadData();
  };

  // Reset User Password (6 characters)
  const handleResetPassword = async (phone: string) => {
    if (editPwdVal.length !== 6) {
      alert('❌ 重置密码必须恰好为 6 位数 (字母/数字)');
      return;
    }
    sounds.playClick();
    await authStore.modifyUser(phone, 'UPDATE_PASSWORD', { password: editPwdVal });
    alert(`✅ 已成功将手机号 ${phone} 的密码重置为：${editPwdVal}`);
    setEditingPhone(null);
    setEditPwdVal('');
    loadData();
  };

  // Delete User
  const handleDeleteUser = async (phone: string, nickname: string) => {
    if (!confirm(`确定要彻底删除玩家 [${nickname}] (${phone}) 的账号吗？`)) return;
    sounds.playClick();
    await authStore.modifyUser(phone, 'DELETE_USER');
    loadData();
  };

  // Send Command in Bot Simulator
  const handleSendSimCommand = async (customCmd?: string) => {
    const cmdText = customCmd || simInput.trim();
    if (!cmdText) return;

    sounds.playClick();
    const userMsgTime = new Date().toLocaleTimeString();
    setSimMessages(prev => [...prev, { sender: 'user', text: cmdText, time: userMsgTime }]);
    setSimInput('');

    const res = await authStore.sendBotCommand(cmdText);
    const botMsgTime = new Date().toLocaleTimeString();
    setSimMessages(prev => [
      ...prev,
      { sender: 'bot', text: res.replyText, time: botMsgTime },
    ]);

    // Refresh data in case phones/coins were changed
    loadData();
  };

  // Save Bot Config
  const handleSaveBotConfig = async () => {
    sounds.playClick();
    try {
      await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: botTokenInput,
          botUsername: botUsernameInput,
        }),
      });
      alert('✅ Telegram Bot 配置更新成功！');
      loadData();
    } catch {
      alert('配置更新完成');
    }
  };

  const usersMap = users.reduce((acc, u) => {
    acc[u.phone] = u;
    return acc;
  }, {} as Record<string, UserAccount>);

  const filteredPhones = authorizedPhones.filter(p => p.includes(phoneSearch.trim()));
  const filteredUsers = users.filter(
    u => u.phone.includes(userSearch.trim()) || u.nickname.includes(userSearch.trim())
  );

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl w-full max-w-4xl h-[92vh] max-h-[700px] overflow-hidden shadow-2xl text-slate-100 flex flex-col relative">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-950 p-4 border-b border-amber-500/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Bot className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <h3 className="font-black text-lg text-amber-200 flex items-center gap-2">
                <span>Telegram Bot 管理员控制台</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                  Super Admin
                </span>
              </h3>
              <p className="text-[11px] text-amber-400/80">
                管理 TG Bot 授权手机号、玩家账号、6位密码与机器人指令
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/90 p-1.5 shrink-0 gap-1 overflow-x-auto">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('PHONES');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PHONES'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>📱 TG 授权手机号 ({authorizedPhones.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('USERS');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'USERS'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 玩家账号管理 ({users.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('SIMULATOR');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SIMULATOR'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>🤖 Bot 指令仿真器</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('CONFIG');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'CONFIG'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>⚙️ Bot 密钥与配置</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-900/60">
          {/* ================= TAB 1: AUTHORIZED PHONES ================= */}
          {activeTab === 'PHONES' && (
            <div className="space-y-4">
              {/* Add Phone Form & Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>新增授权手机号</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="输入手机号 (例: 13912345678)"
                      value={newPhoneInput}
                      onChange={e => setNewPhoneInput(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      onClick={handleAddPhone}
                      className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer shadow active:scale-95 transition-transform"
                    >
                      授权
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>搜索手机号</span>
                  </div>
                  <input
                    type="text"
                    placeholder="按手机号筛选..."
                    value={phoneSearch}
                    onChange={e => setPhoneSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Phones Table List */}
              <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 grid grid-cols-12 gap-2">
                  <span className="col-span-1">#</span>
                  <span className="col-span-4">授权手机号</span>
                  <span className="col-span-4">注册状态 / 绑定账号</span>
                  <span className="col-span-3 text-right">操作</span>
                </div>

                <div className="divide-y divide-slate-800/60 max-h-[340px] overflow-y-auto">
                  {filteredPhones.map((phoneNum, idx) => {
                    const regUser = usersMap[phoneNum];
                    return (
                      <div
                        key={phoneNum}
                        className="px-4 py-2.5 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-900/50 transition-colors"
                      >
                        <span className="col-span-1 font-mono text-slate-500">{idx + 1}</span>
                        <span className="col-span-4 font-mono font-bold text-amber-200">
                          {phoneNum}
                        </span>
                        <span className="col-span-4">
                          {regUser ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>{regUser.nickname}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">
                              <span>未注册</span>
                            </span>
                          )}
                        </span>
                        <span className="col-span-3 text-right">
                          <button
                            onClick={() => handleRevokePhone(phoneNum)}
                            className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-500/30 text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>取消授权</span>
                          </button>
                        </span>
                      </div>
                    );
                  })}

                  {filteredPhones.length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-500">
                      暂无找到符合条件的授权手机号
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PLAYER ACCOUNTS ================= */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="按手机号或昵称搜索玩家..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>刷新</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
                {filteredUsers.map(u => (
                  <div
                    key={u.phone}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-slate-900 border border-amber-500/40 flex items-center justify-center text-lg">
                          {u.avatar}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-amber-200 flex items-center gap-2">
                            <span>{u.nickname}</span>
                            {u.isBotAdmin && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] border border-amber-500/40 font-mono">
                                👑 Bot管理员
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                            <span>📱 {u.phone}</span>
                            <span>🔑 密码: <code className="text-cyan-300 bg-slate-900 px-1 rounded">{u.password}</code></span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-black text-yellow-300">
                          💰 {u.coins.toLocaleString()} 豆
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          {u.wins}胜 / {u.losses}负
                        </div>
                      </div>
                    </div>

                    {/* Inline Editor for Coins or Password */}
                    {editingPhone === u.phone ? (
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/40 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                          <span>编辑玩家: {u.nickname}</span>
                          <button
                            onClick={() => setEditingPhone(null)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            ✕ 取消
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              修改欢乐豆数量:
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editCoinVal}
                                onChange={e => setEditCoinVal(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                              <button
                                onClick={() => handleSaveCoins(u.phone)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shrink-0 cursor-pointer"
                              >
                                保存
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              重置密码 (必须 6 位数):
                            </label>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                maxLength={6}
                                value={editPwdVal}
                                onChange={e => setEditPwdVal(e.target.value)}
                                placeholder="6位数"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                              <button
                                onClick={() => handleResetPassword(u.phone)}
                                className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-bold text-white shrink-0 cursor-pointer"
                              >
                                重置
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-800/80 pt-2">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setEditingPhone(u.phone);
                            setEditCoinVal(u.coins);
                            setEditPwdVal(u.password);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-amber-500/30 cursor-pointer"
                        >
                          ✏️ 修改豆数 / 密码
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u.phone, u.nickname)}
                          className="px-2.5 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-[10px] font-bold border border-red-500/30 cursor-pointer"
                        >
                          🗑️ 删除用户
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-xs text-slate-500">
                    暂无符合条件的玩家账号
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: BOT SIMULATOR ================= */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-3 flex flex-col h-[420px]">
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-2 rounded-2xl border border-slate-800 text-[10px]">
                <span className="text-slate-400 font-bold self-center mr-1">快捷指令:</span>
                <button
                  onClick={() => handleSendSimCommand('/help')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 cursor-pointer font-mono"
                >
                  /help
                </button>
                <button
                  onClick={() => handleSendSimCommand('/list')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 cursor-pointer font-mono"
                >
                  /list (查看授权)
                </button>
                <button
                  onClick={() => handleSendSimCommand('/users')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 cursor-pointer font-mono"
                >
                  /users (查看玩家)
                </button>
                <button
                  onClick={() => handleSendSimCommand('/auth 13999887766')}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer font-mono"
                >
                  /auth 13999887766
                </button>
              </div>

              {/* Chat Log Window */}
              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-3 overflow-y-auto space-y-3 font-mono text-xs">
                {simMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 whitespace-pre-wrap ${
                        msg.sender === 'user'
                          ? 'bg-amber-500 text-slate-950 font-bold rounded-tr-none'
                          : 'bg-slate-900 border border-slate-800 text-emerald-300 rounded-tl-none'
                      }`}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入 Telegram 指令 (例: /auth 13800138000 或 /addcoins 13800138000 50000)"
                  value={simInput}
                  onChange={e => setSimInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendSimCommand()}
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
                <button
                  onClick={() => handleSendSimCommand()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-slate-950" />
                  <span>发送</span>
                </button>
              </div>
            </div>
          )}

          {/* ================= TAB 4: CONFIG & LOGS ================= */}
          {activeTab === 'CONFIG' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-amber-400" />
                  <span>Telegram Bot Webhook 与 API Token</span>
                </h4>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Telegram Bot Token (Bot Father 获取):
                  </label>
                  <input
                    type="text"
                    value={botTokenInput}
                    onChange={e => setBotTokenInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    Telegram Bot 用户名:
                  </label>
                  <input
                    type="text"
                    value={botUsernameInput}
                    onChange={e => setBotUsernameInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">
                    后端 Webhook 处理 URL:
                  </label>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center justify-between">
                    <span>http://localhost:3000/api/bot/webhook</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText('http://localhost:3000/api/bot/webhook');
                        setCopiedMsg(true);
                        setTimeout(() => setCopiedMsg(false), 2000);
                      }}
                      className="text-xs text-amber-300 hover:text-white cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedMsg ? '已复制!' : '复制'}</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSaveBotConfig}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow transition-all"
                >
                  保存 Telegram Bot 配置
                </button>
              </div>

              {/* System Logs */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>系统运行日志</span>
                </h4>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-1.5 text-[11px] font-mono text-slate-300">
                  {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2 border-b border-slate-800/40 pb-1">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className="text-emerald-400 font-bold">[{log.type}]</span>
                      <span className="text-slate-200">{log.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between px-4 shrink-0">
          <span>当前账号: <b>{currentUser?.nickname || 'TG Bot 管理员'}</b> ({currentUser?.phone})</span>
          <span className="text-amber-400 font-mono">TG Bot Engine Active</span>
        </div>
      </div>
    </div>
  );
};
