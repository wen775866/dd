import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// ---------------- LOAD .ENV FROM MULTIPLE LOCATIONS ----------------
// Supports Termux root directory (~/.env or ../.env above 'dd') and local dir ('./.env')
const envPaths = [
  path.resolve(process.cwd(), '../.env'), // Parent directory (Termux root above 'dd')
  path.resolve(process.cwd(), '.env'),    // Current directory
  path.resolve(process.env.HOME || '/data/data/com.termux/files/home', '.env'), // Termux home
];

let loadedEnvPath = '';
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    console.log(`✅ 已成功加载 .env 配置文件: ${envPath}`);
    break;
  }
}

if (!loadedEnvPath) {
  console.log(`ℹ️ 未找到 .env 配置文件，将使用默认环境变量或管理控制台配置`);
}

const app = express();
app.use(express.json());

// Path to persistent JSON store
const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

interface UserRecord {
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

interface BotConfig {
  token: string;
  botUsername: string;
  botId: string;
  adminId: string;
  webhookUrl: string;
}

interface DatabaseSchema {
  authorizedPhones: string[];
  users: Record<string, UserRecord>; // keyed by phone
  botConfig: BotConfig;
  logs: { id: string; time: string; type: string; message: string }[];
}

// Environment Variables Resolution (Supports BOT_TOKEN, BOT_ID and TG_API_HOST)
const ENV_BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || process.env.TG_BOT_TOKEN || '';
const ENV_BOT_ID = process.env.BOT_ID || process.env.TELEGRAM_BOT_ID || process.env.TG_BOT_ID || (ENV_BOT_TOKEN.split(':')[0] || '');
const ENV_TG_API_HOST = process.env.TG_API_HOST || process.env.TELEGRAM_API_HOST || 'https://api.telegram.org';

// Default admin phone
const DEFAULT_ADMIN_PHONE = '13800138000';

// Initial default database state
const defaultDb: DatabaseSchema = {
  authorizedPhones: [
    DEFAULT_ADMIN_PHONE,
    '18888888888',
    '15999999999',
    '13333333333',
    '13666666666',
    '13999999999',
  ],
  users: {
    [DEFAULT_ADMIN_PHONE]: {
      phone: DEFAULT_ADMIN_PHONE,
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
  },
  botConfig: {
    token: ENV_BOT_TOKEN || '7890123456:AAFdExampleTokenForChuDaDiBot',
    botUsername: '@ChuDaDiGame_Bot',
    botId: ENV_BOT_ID || '7890123456',
    adminId: '123456789',
    webhookUrl: 'https://example.com/api/bot/webhook',
  },
  logs: [
    {
      id: '1',
      time: new Date().toISOString(),
      type: 'BOT_EVENT',
      message: loadedEnvPath
        ? `使用配置文件 ${loadedEnvPath} 启动 Telegram Bot 服务`
        : 'Telegram Bot 管理中心服务启动，等待 .env 或控制台配置',
    },
  ],
};

function loadDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      const merged = { ...defaultDb, ...parsed };
      // Override with .env token & botId if present
      if (ENV_BOT_TOKEN) merged.botConfig.token = ENV_BOT_TOKEN;
      if (ENV_BOT_ID) merged.botConfig.botId = ENV_BOT_ID;
      return merged;
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
  }
  return defaultDb;
}

function saveDatabase(dbSchema: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(dbSchema, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

let db = loadDatabase();

function addLog(type: string, message: string) {
  const logItem = {
    id: String(Date.now()),
    time: new Date().toLocaleTimeString(),
    type,
    message,
  };
  db.logs.unshift(logItem);
  if (db.logs.length > 100) db.logs = db.logs.slice(0, 100);
  saveDatabase(db);
}

// ---------------- TELEGRAM BOT KEYBOARD & API CALLER ----------------
const BOT_KEYBOARD = {
  keyboard: [
    [{ text: '📱 授权手机号' }, { text: '📋 授权列表' }],
    [{ text: '👥 玩家清单' }, { text: '💰 充值积分' }],
    [{ text: '🔑 重置密码' }, { text: 'ℹ️ 运行状态' }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
};

function formatBotTokenPath(rawToken: string): string {
  const clean = rawToken.trim();
  if (!clean) return '';
  if (clean.toLowerCase().startsWith('bot')) {
    return clean;
  }
  return `bot${clean}`;
}

async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  botToken?: string,
  includeKeyboard: boolean = true
) {
  const token = botToken || db.botConfig.token;
  if (!token || token.includes('ExampleToken')) return;

  try {
    const tokenPath = formatBotTokenPath(token);
    const url = `${ENV_TG_API_HOST}/${tokenPath}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };
    if (includeKeyboard) {
      payload.reply_markup = BOT_KEYBOARD;
    }

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send Telegram message:', err);
  }
}

// Telegram Command & Reply Keyboard Processor
function processTelegramCommand(commandText: string, chatId: string | number = '123456789'): string {
  const cleanText = commandText.trim();
  const parts = cleanText.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1] || '';
  const arg2 = parts[2] || '';

  // Handle Telegram Keyboard Button clicks
  if (cleanText === '📱 授权手机号') {
    return '📱 *手机号注册授权*\n\n请发送指令：\n`/auth 手机号`\n\n例如：`/auth 13912345678`';
  }
  if (cleanText === '📋 授权列表') {
    return processTelegramCommand('/list', chatId);
  }
  if (cleanText === '👥 玩家清单') {
    return processTelegramCommand('/users', chatId);
  }
  if (cleanText === '💰 充值积分') {
    return '💰 *积分充值功能*\n\n请发送指令：\n`/addcoins 手机号 积分数量`\n\n例如：`/addcoins 13800138000 50000`';
  }
  if (cleanText === '🔑 重置密码') {
    return '🔑 *重置玩家 6 位数密码*\n\n请发送指令：\n`/resetpwd 手机号 6位新密码`\n\n例如：`/resetpwd 13800138000 666888`';
  }
  if (cleanText === 'ℹ️ 运行状态') {
    return processTelegramCommand('/info', chatId);
  }

  let replyText = '';

  switch (cmd) {
    case '/start':
    case '/menu':
    case '/help':
      replyText =
        '🤖 *锄大地 Telegram 管理控制面板*\n\n' +
        '已为你启动底部**交互按键菜单**，你可以直接点击下方按钮或发送快捷指令：\n\n' +
        '🔹 `/auth 手机号` - 授权该手机号注册账号\n' +
        '🔹 `/unauth 手机号` - 取消手机号注册授权\n' +
        '🔹 `/list` - 查看已授权手机号清单\n' +
        '🔹 `/users` - 查看玩家列表与积分\n' +
        '🔹 `/addcoins 手机号 积分` - 充值游戏积分\n' +
        '🔹 `/resetpwd 手机号 6位密码` - 重置密码\n' +
        '🔹 `/info` - 查看节点运行状态';
      break;

    case '/auth':
    case '/authorize':
      if (!arg1) {
        replyText = '❌ 格式错误！正确格式：`/auth 手机号` 例如：`/auth 13988889999`';
      } else {
        if (!db.authorizedPhones.includes(arg1)) {
          db.authorizedPhones.push(arg1);
          saveDatabase(db);
          addLog('TG_BOT', `Telegram Bot 成功授权手机号: ${arg1}`);
          replyText = `✅ 授权成功！手机号 \`${arg1}\` 已获得注册权限，现在可在游戏中进行注册。`;
        } else {
          replyText = `ℹ️ 手机号 \`${arg1}\` 之前已经获得过授权。`;
        }
      }
      break;

    case '/unauth':
    case '/revoke':
      if (!arg1) {
        replyText = '❌ 格式错误！正确格式：`/unauth 手机号`';
      } else {
        db.authorizedPhones = db.authorizedPhones.filter(p => p !== arg1);
        saveDatabase(db);
        addLog('TG_BOT', `Telegram Bot 取消授权手机号: ${arg1}`);
        replyText = `🛑 已取消手机号 \`${arg1}\` 的注册授权！`;
      }
      break;

    case '/list':
      replyText =
        `📋 *已授权手机号列表 (${db.authorizedPhones.length} 个)*:\n` +
        db.authorizedPhones
          .map(
            (p, idx) =>
              `${idx + 1}. \`${p}\` ${db.users[p] ? '✅ (已注册: ' + db.users[p].nickname + ')' : '⏳ (未注册)'}`
          )
          .join('\n');
      break;

    case '/users':
      const userList = Object.values(db.users);
      replyText =
        `👥 *注册玩家列表 (${userList.length} 人)*:\n` +
        userList
          .map(
            (u, idx) =>
              `${idx + 1}. *${u.nickname}* (\`${u.phone}\`) - 💰${u.coins.toLocaleString()}积分 [${u.isBotAdmin ? '👑管理员' : '玩家'}]`
          )
          .join('\n');
      break;

    case '/addcoins':
      if (!arg1 || !arg2 || isNaN(Number(arg2))) {
        replyText = '❌ 格式错误！正确格式：`/addcoins 手机号 积分数量` 例如 `/addcoins 13800138000 50000`';
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `❌ 未找到手机号为 \`${arg1}\` 的玩家，请先确认手机号。`;
        } else {
          const delta = Number(arg2);
          u.coins += delta;
          saveDatabase(db);
          addLog('TG_BOT', `TG 充值玩家 ${u.nickname} 积分: ${delta}`);
          replyText = `💰 充值成功！玩家 *${u.nickname}* (\`${arg1}\`) 当前积分：\`${u.coins.toLocaleString()}\``;
        }
      }
      break;

    case '/resetpwd':
      if (!arg1 || !arg2 || arg2.length !== 6) {
        replyText = '❌ 格式错误！新密码必须为 6 位数。正确格式：`/resetpwd 手机号 6位新密码`';
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `❌ 未找到手机号为 \`${arg1}\` 的玩家`;
        } else {
          u.password = arg2;
          saveDatabase(db);
          addLog('TG_BOT', `TG 重置玩家 ${u.nickname} 密码为: ${arg2}`);
          replyText = `🔑 密码重置成功！玩家 *${u.nickname}* 的新密码设为：\`${arg2}\``;
        }
      }
      break;

    case '/info':
      replyText =
        `ℹ️ *Telegram Bot 运行状态*\n` +
        `• 配置文件: \`${loadedEnvPath || '内置/环境变量'}\` \n` +
        `• Bot ID: \`${db.botConfig.botId || '7890123456'}\` \n` +
        `• 授权手机号数: \`${db.authorizedPhones.length}\` \n` +
        `• 游戏注册玩家: \`${Object.keys(db.users).length}\``;
      break;

    default:
      replyText = `🤖 未知命令: \`${cleanText}\`。发送 \`/help\` 查看键盘菜单与指令说明。`;
  }

  return replyText;
}

// ---------------- TELEGRAM BOT LONG POLLING LOOP ----------------
let lastUpdateId = 0;
async function startTelegramPolling() {
  const token = db.botConfig.token;
  if (!token || token.includes('ExampleToken')) {
    console.log('ℹ️ Telegram Bot Token 未配置，可通过 .env 设置 BOT_TOKEN 开启轮询');
    return;
  }

  console.log(`🤖 开始启动 Telegram Bot 实时 Polling 监听 (Bot ID: ${db.botConfig.botId})...`);
  addLog('TG_POLLING', 'Telegram Bot 键盘菜单与轮询服务已在线运行');

  async function pollUpdates() {
    try {
      const tokenPath = formatBotTokenPath(token);
      const url = `${ENV_TG_API_HOST}/${tokenPath}/getUpdates?offset=${lastUpdateId + 1}&timeout=20`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            if (update.message && update.message.text) {
              const text = update.message.text;
              const chatId = update.message.chat.id;
              console.log(`📩 收到 Telegram 来自 ${chatId} 的消息: ${text}`);

              const reply = processTelegramCommand(text, chatId);
              await sendTelegramMessage(chatId, reply, token, true);
            }
          }
        }
      }
    } catch (err) {
      // network timeout or offline
    } finally {
      setTimeout(pollUpdates, 2000);
    }
  }

  pollUpdates();
}

// ---------------- API ROUTES ----------------

// Get Bot Env Status
app.get('/api/bot/env-status', (req, res) => {
  return res.json({
    loadedEnvPath,
    botConfig: db.botConfig,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
  });
});

// Set Webhook for Telegram Bot
app.post('/api/bot/set-webhook', async (req, res) => {
  const { webhookUrl } = req.body || {};
  const token = db.botConfig.token;

  if (!token || token.includes('ExampleToken')) {
    return res.status(400).json({ error: '请先配置有效的 Telegram BOT_TOKEN' });
  }

  const urlToSet = webhookUrl || db.botConfig.webhookUrl;
  if (!urlToSet) {
    return res.status(400).json({ error: '请提供 Webhook URL 地址' });
  }

  try {
    const tokenPath = formatBotTokenPath(token);
    const tgUrl = `${ENV_TG_API_HOST}/${tokenPath}/setWebhook?url=${encodeURIComponent(urlToSet)}`;
    const tgRes = await fetch(tgUrl);
    const tgData = await tgRes.json();

    if (tgData.ok) {
      db.botConfig.webhookUrl = urlToSet;
      saveDatabase(db);
      addLog('TG_WEBHOOK', `注册 Telegram Webhook 成功: ${urlToSet}`);
      return res.json({ success: true, message: `✅ 成功绑定 Webhook 到: ${urlToSet}`, result: tgData });
    } else {
      return res.status(400).json({ error: tgData.description || '绑定失败' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || '设置 Webhook 出错' });
  }
});

// Check phone TG authorization status
app.get('/api/auth/check-phone', (req, res) => {
  const phone = String(req.query.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请提供手机号' });
  }
  const isAuthorized = db.authorizedPhones.includes(phone);
  const isRegistered = !!db.users[phone];
  return res.json({
    phone,
    isAuthorized,
    isRegistered,
    message: isAuthorized
      ? isRegistered
        ? '该手机号已获得 TG 授权且已注册'
        : '该手机号已获得 TG 授权，可进行注册'
      : '该手机号未经 Telegram Bot 授权，无法注册',
  });
});

// User Registration
app.post('/api/auth/register', (req, res) => {
  const { phone, nickname, password, avatar } = req.body || {};

  const cleanPhone = String(phone || '').trim();
  const cleanNickname = String(nickname || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!cleanPhone || !cleanNickname || !cleanPassword) {
    return res.status(400).json({ error: '请填写手机号、昵称和密码' });
  }

  // Check 1: Must be authorized by TG bot
  if (!db.authorizedPhones.includes(cleanPhone)) {
    return res.status(403).json({
      error: '该手机号未获得 Telegram Bot 授权！请通过 Telegram 机器人授权后再进行注册。',
    });
  }

  // Check 2: Password must be 6 characters
  if (cleanPassword.length !== 6) {
    return res.status(400).json({ error: '密码必须为 6 位数 (不限大小写字母或数字)' });
  }

  // Check 3: Check if phone already registered
  if (db.users[cleanPhone]) {
    return res.status(400).json({ error: '该手机号已注册，请直接登录' });
  }

  const newUser: UserRecord = {
    phone: cleanPhone,
    nickname: cleanNickname,
    password: cleanPassword,
    avatar: avatar || '😎',
    coins: 30000,
    diamonds: 300,
    wins: 0,
    losses: 0,
    isBotAdmin: cleanPhone === DEFAULT_ADMIN_PHONE,
    createdAt: new Date().toISOString(),
  };

  db.users[cleanPhone] = newUser;
  addLog('REGISTER', `新用户注册: ${cleanNickname} (${cleanPhone})`);
  saveDatabase(db);

  return res.json({
    success: true,
    user: newUser,
    message: '注册成功，欢迎加入锄大地！',
  });
});

// User Login
app.post('/api/auth/login', (req, res) => {
  const { phoneOrNickname, password } = req.body || {};
  const query = String(phoneOrNickname || '').trim();
  const cleanPassword = String(password || '').trim();

  if (!query || !cleanPassword) {
    return res.status(400).json({ error: '请输入手机号/昵称和密码' });
  }

  const user = Object.values(db.users).find(
    u => u.phone === query || u.nickname === query
  );

  if (!user) {
    return res.status(404).json({ error: '账号不存在，请先核对手机号或进行注册' });
  }

  if (user.password.toLowerCase() !== cleanPassword.toLowerCase()) {
    return res.status(401).json({ error: '密码不正确，密码为 6 位数' });
  }

  addLog('LOGIN', `用户登录: ${user.nickname} (${user.phone})`);
  return res.json({
    success: true,
    user,
    message: '登录成功！',
  });
});

// Update Profile
app.post('/api/auth/update-profile', (req, res) => {
  const { phone, coins, wins, losses, nickname, avatar } = req.body || {};
  if (!phone || !db.users[phone]) {
    return res.status(400).json({ error: '无效用户' });
  }

  const user = db.users[phone];
  if (typeof coins === 'number') user.coins = coins;
  if (typeof wins === 'number') user.wins = wins;
  if (typeof losses === 'number') user.losses = losses;
  if (nickname) user.nickname = nickname;
  if (avatar) user.avatar = avatar;

  saveDatabase(db);
  return res.json({ success: true, user });
});

// Authorize Phone
app.post('/api/bot/authorize-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入要授权的手机号' });
  }

  if (!db.authorizedPhones.includes(phone)) {
    db.authorizedPhones.push(phone);
    addLog('TG_BOT_AUTH', `管理员/Bot 授权新手机号: ${phone}`);
    saveDatabase(db);
  }

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `手机号 ${phone} 已成功授权！`,
  });
});

// Revoke Phone
app.post('/api/bot/revoke-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入手机号' });
  }

  db.authorizedPhones = db.authorizedPhones.filter(p => p !== phone);
  addLog('TG_BOT_REVOKE', `取消授权手机号: ${phone}`);
  saveDatabase(db);

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `已取消手机号 ${phone} 的授权`,
  });
});

// Get Admin Data
app.get('/api/admin/users', (req, res) => {
  return res.json({
    users: Object.values(db.users),
    authorizedPhones: db.authorizedPhones,
    logs: db.logs,
    botConfig: db.botConfig,
    loadedEnvPath,
  });
});

// Modify User
app.post('/api/admin/modify-user', (req, res) => {
  const { phone, coins, password, isBotAdmin, action } = req.body || {};
  const user = db.users[phone];

  if (!user && action !== 'CREATE_AND_AUTH') {
    return res.status(404).json({ error: '未找到该用户' });
  }

  if (action === 'DELETE_USER') {
    delete db.users[phone];
    addLog('ADMIN_DELETE', `管理员删除用户: ${phone}`);
    saveDatabase(db);
    return res.json({ success: true, message: `已删除用户 ${phone}` });
  }

  if (typeof coins === 'number' && user) {
    user.coins = coins;
    addLog('ADMIN_COINS', `修改用户 ${user.nickname} 积分: ${coins}`);
  }

  if (password && user) {
    if (password.length !== 6) {
      return res.status(400).json({ error: '新密码必须为 6 位数' });
    }
    user.password = password;
    addLog('ADMIN_PASSWORD', `重置用户 ${user.nickname} 密码为: ${password}`);
  }

  if (typeof isBotAdmin === 'boolean' && user) {
    user.isBotAdmin = isBotAdmin;
    addLog('ADMIN_ROLE', `修改用户 ${user.nickname} Bot 管理员权限: ${isBotAdmin}`);
  }

  saveDatabase(db);
  return res.json({ success: true, user, users: Object.values(db.users) });
});

// Update Bot Config
app.post('/api/bot/config', (req, res) => {
  const { token, botUsername, botId, adminId, webhookUrl } = req.body || {};
  if (token !== undefined) db.botConfig.token = token;
  if (botUsername !== undefined) db.botConfig.botUsername = botUsername;
  if (botId !== undefined) db.botConfig.botId = botId;
  if (adminId !== undefined) db.botConfig.adminId = adminId;
  if (webhookUrl !== undefined) db.botConfig.webhookUrl = webhookUrl;

  addLog('BOT_CONFIG', '更新 Telegram Bot 配置信息');
  saveDatabase(db);

  // Restart polling if token was changed
  startTelegramPolling();

  return res.json({ success: true, botConfig: db.botConfig });
});

// Webhook GET Diagnostic route for browser testing
app.get('/api/bot/webhook', (req, res) => {
  return res.json({
    status: 'ok',
    message: '✅ Telegram Bot Webhook 接口服务正常在线！请在 Telegram 软件中向 Bot 发送指令进行对讲。',
    botId: db.botConfig.botId,
    botUsername: db.botConfig.botUsername,
    authorizedPhonesCount: db.authorizedPhones.length,
    usersCount: Object.keys(db.users).length,
  });
});

// Webhook Handler (Returns method: sendMessage directly in HTTP response JSON for zero-lag TG Webhook reply)
app.post('/api/bot/webhook', async (req, res) => {
  const body = req.body || {};
  let commandText = '';
  let chatId: string | number = '';

  if (body.message && body.message.text) {
    commandText = body.message.text.trim();
    chatId = body.message.chat?.id || '';
  } else if (body.text) {
    commandText = String(body.text).trim();
  }

  if (!commandText) {
    return res.json({ status: 'ignored', reason: 'No text message' });
  }

  console.log(`📩 收到 Telegram Webhook 指令 [Chat: ${chatId}]: ${commandText}`);
  addLog('TG_WEBHOOK', `接收到 Telegram Webhook 指令: ${commandText}`);
  const replyText = processTelegramCommand(commandText, chatId || '123456789');

  // Also try async background call as fallback
  if (chatId) {
    sendTelegramMessage(chatId, replyText, db.botConfig.token, true).catch(() => {});
  }

  // Telegram official Webhook direct response
  if (chatId) {
    return res.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: replyText,
      parse_mode: 'Markdown',
      reply_markup: BOT_KEYBOARD,
    });
  }

  return res.json({
    ok: true,
    replyText,
    authorizedPhones: db.authorizedPhones,
    usersCount: Object.keys(db.users).length,
  });
});

// ---------------- START SERVER ----------------
async function start() {
  const PORT = Number(process.env.PORT) || 8080;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 锄大地游戏服务器已启动: http://0.0.0.0:${PORT}`);
    if (loadedEnvPath) {
      console.log(`📄 已载入 .env: ${loadedEnvPath}`);
    }

    // Start Real Telegram Polling if token is present
    startTelegramPolling();
  });
}

start();
