import { UserProfile } from '../types/game';

export interface UserAccount {
  phone: string;
  nickname: string;
  password: string; // 6 characters
  avatar: string;
  coins: number;
  diamonds: number;
  wins: number;
  losses: number;
  isBotAdmin: boolean;
  createdAt: string;
}

export interface BotConfig {
  token: string;
  botUsername: string;
  webhookUrl: string;
}

const LOCAL_STORAGE_USER = 'chudadi_active_user_v2';
const LOCAL_STORAGE_AUTH_PHONES = 'chudadi_local_auth_phones_v2';
const LOCAL_STORAGE_USERS_DB = 'chudadi_local_users_db_v2';

// Default initial accounts for client-side fallback
const DEFAULT_AUTH_PHONES = [
  '13800138000',
  '18888888888',
  '15999999999',
  '13333333333',
  '13666666666',
  '13999999999',
];

const DEFAULT_USERS_DB: Record<string, UserAccount> = {
  '13800138000': {
    phone: '13800138000',
    nickname: '锄神大司马',
    password: 'admin8', // 6 characters
    avatar: '😎',
    coins: 88888,
    diamonds: 888,
    wins: 66,
    losses: 12,
    isBotAdmin: true,
    createdAt: new Date().toISOString(),
  },
  '18888888888': {
    phone: '18888888888',
    nickname: '赌圣阿星',
    password: '123456', // 6 characters
    avatar: '👑',
    coins: 50000,
    diamonds: 500,
    wins: 30,
    losses: 10,
    isBotAdmin: false,
    createdAt: new Date().toISOString(),
  },
};

class AuthStoreService {
  private activeUser: UserAccount | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadActiveUser();
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public getActiveUser(): UserAccount | null {
    return this.activeUser;
  }

  public getActiveProfile(): UserProfile {
    if (this.activeUser) {
      return {
        nickname: this.activeUser.nickname,
        avatar: this.activeUser.avatar,
        coins: this.activeUser.coins,
        diamonds: this.activeUser.diamonds,
        wins: this.activeUser.wins,
        losses: this.activeUser.losses,
        title: this.activeUser.isBotAdmin ? 'TG Bot 管理员' : '高阶锄仙',
        hasCheckedInToday: false,
      };
    }
    return {
      nickname: '未登录游客',
      avatar: '👤',
      coins: 10000,
      diamonds: 100,
      wins: 0,
      losses: 0,
      title: '游客模式',
      hasCheckedInToday: false,
    };
  }

  private loadActiveUser() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USER);
      if (saved) {
        this.activeUser = JSON.parse(saved);
      }
    } catch {}
  }

  private saveActiveUser(user: UserAccount | null) {
    this.activeUser = user;
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER);
    }
    this.notify();
  }

  // Helper for Local Fallback DB
  private getLocalAuthPhones(): string[] {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_AUTH_PHONES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_AUTH_PHONES;
  }

  private saveLocalAuthPhones(phones: string[]) {
    localStorage.setItem(LOCAL_STORAGE_AUTH_PHONES, JSON.stringify(phones));
  }

  private getLocalUsersDb(): Record<string, UserAccount> {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_USERS_DB);
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_USERS_DB;
  }

  private saveLocalUsersDb(db: Record<string, UserAccount>) {
    localStorage.setItem(LOCAL_STORAGE_USERS_DB, JSON.stringify(db));
  }

  // 1. Check Phone TG Authorization Status
  public async checkPhoneAuthorized(phone: string): Promise<{
    isAuthorized: boolean;
    isRegistered: boolean;
    message: string;
  }> {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      return { isAuthorized: false, isRegistered: false, message: '请输入手机号' };
    }

    try {
      const res = await fetch(`/api/auth/check-phone?phone=${encodeURIComponent(cleanPhone)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Fallback to local
    const authPhones = this.getLocalAuthPhones();
    const users = this.getLocalUsersDb();
    const isAuthorized = authPhones.includes(cleanPhone);
    const isRegistered = !!users[cleanPhone];

    return {
      isAuthorized,
      isRegistered,
      message: isAuthorized
        ? isRegistered
          ? '该手机号已获得 TG 授权且已注册'
          : '该手机号已获得 TG 授权，可进行注册'
        : '该手机号未经 Telegram Bot 授权，无法注册',
    };
  }

  // 2. Register Account
  public async register(
    phone: string,
    nickname: string,
    password: string,
    avatar: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const cleanPhone = phone.trim();
    const cleanNickname = nickname.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length !== 6) {
      return { success: false, error: '密码必须恰好为 6 位数 (不限大小写字母或数字)' };
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          nickname: cleanNickname,
          password: cleanPassword,
          avatar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || '注册失败' };
      }

      this.saveActiveUser(data.user);
      return { success: true, user: data.user };
    } catch {
      // Local fallback
      const authPhones = this.getLocalAuthPhones();
      if (!authPhones.includes(cleanPhone)) {
        return {
          success: false,
          error: '该手机号未获得 Telegram Bot 授权！请在 TG 机器人中授权或联系管理员。',
        };
      }

      const users = this.getLocalUsersDb();
      if (users[cleanPhone]) {
        return { success: false, error: '该手机号已注册，请直接登录' };
      }

      const newUser: UserAccount = {
        phone: cleanPhone,
        nickname: cleanNickname,
        password: cleanPassword,
        avatar: avatar || '😎',
        coins: 30000,
        diamonds: 300,
        wins: 0,
        losses: 0,
        isBotAdmin: cleanPhone === '13800138000',
        createdAt: new Date().toISOString(),
      };

      users[cleanPhone] = newUser;
      this.saveLocalUsersDb(users);
      this.saveActiveUser(newUser);

      return { success: true, user: newUser };
    }
  }

  // 3. Login
  public async login(
    phoneOrNickname: string,
    password: string
  ): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
    const query = phoneOrNickname.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length !== 6) {
      return { success: false, error: '密码格式为 6 位数' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrNickname: query, password: cleanPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || '登录失败' };
      }

      this.saveActiveUser(data.user);
      return { success: true, user: data.user };
    } catch {
      // Local fallback
      const users = this.getLocalUsersDb();
      const user = Object.values(users).find(
        u => u.phone === query || u.nickname === query
      );

      if (!user) {
        return { success: false, error: '账号不存在，请核对手机号或先进行注册' };
      }

      if (user.password.toLowerCase() !== cleanPassword.toLowerCase()) {
        return { success: false, error: '密码错误，请输入正确的 6 位数密码' };
      }

      this.saveActiveUser(user);
      return { success: true, user };
    }
  }

  // 4. Logout
  public logout() {
    this.saveActiveUser(null);
  }

  // 5. Update Active User Coins & Stats
  public async syncUserCoins(newCoins: number, isWin?: boolean, isLoss?: boolean) {
    if (!this.activeUser) return;

    const updatedUser = {
      ...this.activeUser,
      coins: newCoins,
      wins: isWin ? this.activeUser.wins + 1 : this.activeUser.wins,
      losses: isLoss ? this.activeUser.losses + 1 : this.activeUser.losses,
    };

    this.saveActiveUser(updatedUser);

    try {
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: updatedUser.phone,
          coins: updatedUser.coins,
          wins: updatedUser.wins,
          losses: updatedUser.losses,
        }),
      });
    } catch {
      const users = this.getLocalUsersDb();
      if (users[updatedUser.phone]) {
        users[updatedUser.phone] = updatedUser;
        this.saveLocalUsersDb(users);
      }
    }
  }

  // 6. Admin API: Fetch Admin Overview
  public async getAdminData(): Promise<{
    users: UserAccount[];
    authorizedPhones: string[];
    logs: any[];
    botConfig: BotConfig;
  }> {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    // Local fallback
    const usersMap = this.getLocalUsersDb();
    const phones = this.getLocalAuthPhones();
    return {
      users: Object.values(usersMap),
      authorizedPhones: phones,
      logs: [
        {
          id: '1',
          time: new Date().toLocaleTimeString(),
          type: 'LOCAL',
          message: '使用本地存储数据模式',
        },
      ],
      botConfig: {
        token: '7890123456:AAFdExampleTokenForChuDaDiBot',
        botUsername: '@ChuDaDiGame_Bot',
        webhookUrl: 'https://example.com/api/bot/webhook',
      },
    };
  }

  // 7. Authorize Phone Number
  public async authorizePhone(phone: string): Promise<boolean> {
    const cleanPhone = phone.trim();
    if (!cleanPhone) return false;

    try {
      const res = await fetch('/api/bot/authorize-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (res.ok) return true;
    } catch {}

    const phones = this.getLocalAuthPhones();
    if (!phones.includes(cleanPhone)) {
      phones.push(cleanPhone);
      this.saveLocalAuthPhones(phones);
    }
    return true;
  }

  // 8. Revoke Phone Authorization
  public async revokePhone(phone: string): Promise<boolean> {
    const cleanPhone = phone.trim();
    try {
      const res = await fetch('/api/bot/revoke-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      });
      if (res.ok) return true;
    } catch {}

    let phones = this.getLocalAuthPhones();
    phones = phones.filter(p => p !== cleanPhone);
    this.saveLocalAuthPhones(phones);
    return true;
  }

  // 9. Admin Modify User
  public async modifyUser(
    phone: string,
    action: string,
    payload?: { coins?: number; password?: string; isBotAdmin?: boolean }
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch('/api/admin/modify-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error };
      return { success: true, message: data.message };
    } catch {}

    // Local fallback
    const users = this.getLocalUsersDb();
    if (action === 'DELETE_USER') {
      delete users[phone];
      this.saveLocalUsersDb(users);
      return { success: true, message: `已删除用户 ${phone}` };
    }

    if (users[phone]) {
      if (payload?.coins !== undefined) users[phone].coins = payload.coins;
      if (payload?.password !== undefined) users[phone].password = payload.password;
      if (payload?.isBotAdmin !== undefined) users[phone].isBotAdmin = payload.isBotAdmin;
      this.saveLocalUsersDb(users);
      return { success: true, message: '操作成功' };
    }

    return { success: false, message: '未找到该用户' };
  }

  // 10. Send Command to Telegram Bot Webhook / Simulator
  public async sendBotCommand(text: string): Promise<{
    replyText: string;
    ok: boolean;
  }> {
    try {
      const res = await fetch('/api/bot/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        return { replyText: data.replyText, ok: true };
      }
    } catch {}

    // Fallback simulation
    const parts = text.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1] || '';
    const arg2 = parts[2] || '';

    if (cmd === '/auth' || cmd === '/authorize') {
      if (!arg1) return { replyText: '❌ 格式错误！正确格式：/auth 手机号', ok: false };
      await this.authorizePhone(arg1);
      return { replyText: `✅ 授权成功！手机号 \`${arg1}\` 已获得注册权限。`, ok: true };
    }

    if (cmd === '/unauth' || cmd === '/revoke') {
      if (!arg1) return { replyText: '❌ 格式错误！正确格式：/unauth 手机号', ok: false };
      await this.revokePhone(arg1);
      return { replyText: `🛑 已取消手机号 \`${arg1}\` 的授权！`, ok: true };
    }

    if (cmd === '/list') {
      const phones = this.getLocalAuthPhones();
      const users = this.getLocalUsersDb();
      const listStr = phones
        .map(
          (p, i) =>
            `${i + 1}. \`${p}\` ${users[p] ? '✅ (已注册: ' + users[p].nickname + ')' : '⏳ (未注册)'}`
        )
        .join('\n');
      return { replyText: `📋 **已授权手机号列表 (${phones.length}个)**:\n${listStr}`, ok: true };
    }

    return {
      replyText: `🤖 本地模拟机器人已收到: "${text}"。发送 /auth 手机号 可进行授权。`,
      ok: true,
    };
  }
}

export const authStore = new AuthStoreService();
