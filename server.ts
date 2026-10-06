import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

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
  webhookUrl: string;
}

interface DatabaseSchema {
  authorizedPhones: string[];
  users: Record<string, UserRecord>; // keyed by phone
  botConfig: BotConfig;
  logs: { id: string; time: string; type: string; message: string }[];
}

// Initial default database state
const defaultDb: DatabaseSchema = {
  authorizedPhones: [
    '13800138000',
    '18888888888',
    '15999999999',
    '13333333333',
    '13666666666',
    '13999999999',
  ],
  users: {
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
  },
  botConfig: {
    token: '7890123456:AAFdExampleTokenForChuDaDiBot',
    botUsername: '@ChuDaDiGame_Bot',
    webhookUrl: 'https://example.com/api/bot/webhook',
  },
  logs: [
    {
      id: '1',
      time: new Date().toISOString(),
      type: 'BOT_EVENT',
      message: 'Telegram Bot 管理中心服务启动，已预载默认授权手机号',
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
      return { ...defaultDb, ...parsed };
    }
  } catch (err) {
    console.error('Error loading db.json:', err);
  }
  return defaultDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
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

// ---------------- API ROUTES ----------------

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

  // Check 2: Password must be exactly 6 characters (case insensitive alphanumeric letters/digits)
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
    coins: 30000, // 30,000 welcome coins
    diamonds: 300,
    wins: 0,
    losses: 0,
    isBotAdmin: cleanPhone === '13800138000', // default admin phone
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

  // Find user by phone or nickname
  const user = Object.values(db.users).find(
    u => u.phone === query || u.nickname === query
  );

  if (!user) {
    return res.status(404).json({ error: '账号不存在，请先核对手机号或进行注册' });
  }

  // Check password (case-insensitive or exact string)
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

// Sync/Update User Profile
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

// ---------------- TELEGRAM BOT ADMIN & BOT API ----------------

// Get Authorized Phone Numbers
app.get('/api/bot/authorized-phones', (req, res) => {
  return res.json({
    authorizedPhones: db.authorizedPhones,
    usersMap: db.users,
  });
});

// Authorize a phone number (Admin / Bot)
app.post('/api/bot/authorize-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入要授权的手机号' });
  }

  if (!db.authorizedPhones.includes(phone)) {
    db.authorizedPhones.push(phone);
    addLog('TG_BOT_AUTH', `Telegram Bot 授权新手机号: ${phone}`);
    saveDatabase(db);
  }

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `手机号 ${phone} 已成功授权！`,
  });
});

// Revoke a phone authorization
app.post('/api/bot/revoke-phone', (req, res) => {
  const phone = String(req.body.phone || '').trim();
  if (!phone) {
    return res.status(400).json({ error: '请输入手机号' });
  }

  db.authorizedPhones = db.authorizedPhones.filter(p => p !== phone);
  addLog('TG_BOT_REVOKE', `Telegram Bot 取消授权手机号: ${phone}`);
  saveDatabase(db);

  return res.json({
    success: true,
    phone,
    authorizedPhones: db.authorizedPhones,
    message: `已取消手机号 ${phone} 的授权`,
  });
});

// Admin Get All Users
app.get('/api/admin/users', (req, res) => {
  return res.json({
    users: Object.values(db.users),
    authorizedPhones: db.authorizedPhones,
    logs: db.logs,
    botConfig: db.botConfig,
  });
});

// Admin Modify User Coins / Password / Admin Status
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
    addLog('ADMIN_COINS', `修改用户 ${user.nickname} 豆数: ${coins}`);
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

// Update Bot Config (Token, Webhook URL, Username)
app.post('/api/bot/config', (req, res) => {
  const { token, botUsername, webhookUrl } = req.body || {};
  if (token !== undefined) db.botConfig.token = token;
  if (botUsername !== undefined) db.botConfig.botUsername = botUsername;
  if (webhookUrl !== undefined) db.botConfig.webhookUrl = webhookUrl;

  addLog('BOT_CONFIG', '更新 Telegram Bot 配置信息');
  saveDatabase(db);
  return res.json({ success: true, botConfig: db.botConfig });
});

// Telegram Bot Webhook & Command Handler
app.post('/api/bot/webhook', (req, res) => {
  const body = req.body || {};
  let commandText = '';
  let chatId = '123456789';

  if (body.message && body.message.text) {
    commandText = body.message.text.trim();
    chatId = body.message.chat?.id || chatId;
  } else if (body.text) {
    commandText = String(body.text).trim();
  }

  if (!commandText) {
    return res.json({ status: 'ignored', reason: 'No text message' });
  }

  addLog('TG_WEBHOOK', `接收到 Telegram 指令: ${commandText}`);

  const parts = commandText.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const arg1 = parts[1] || '';
  const arg2 = parts[2] || '';

  let replyText = '';

  switch (cmd) {
    case '/start':
    case '/help':
      replyText =
        '🤖 **锄大地 Telegram Bot 管理系统**\n\n' +
        '可用命令列表：\n' +
        '🔹 `/auth 手机号` - 授权该手机号注册游戏账号\n' +
        '🔹 `/unauth 手机号` - 移除手机号授权\n' +
        '🔹 `/list` - 查看已授权手机号清单\n' +
        '🔹 `/users` - 查看游戏玩家列表与欢乐豆\n' +
        '🔹 `/addcoins 手机号 数量` - 为玩家充值欢乐豆\n' +
        '🔹 `/resetpwd 手机号 6位密码` - 重置玩家密码\n' +
        '🔹 `/info` - 查看系统运行状态';
      break;

    case '/auth':
    case '/authorize':
      if (!arg1) {
        replyText = '❌ 格式错误！正确格式：`/auth 手机号` 例如：`/auth 13988889999`';
      } else {
        if (!db.authorizedPhones.includes(arg1)) {
          db.authorizedPhones.push(arg1);
          saveDatabase(db);
          replyText = `✅ 授权成功！手机号 \`${arg1}\` 已获得注册权限，现在可以前往游戏进行注册。`;
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
        replyText = `🛑 已取消手机号 \`${arg1}\` 的注册授权！`;
      }
      break;

    case '/list':
      replyText =
        `📋 **已授权手机号列表 (${db.authorizedPhones.length} 个)**:\n` +
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
        `👥 **注册玩家列表 (${userList.length} 人)**:\n` +
        userList
          .map(
            (u, idx) =>
              `${idx + 1}. **${u.nickname}** (\`${u.phone}\`) - 💰${u.coins.toLocaleString()}豆 [${u.isBotAdmin ? '👑Bot管理员' : '玩家'}]`
          )
          .join('\n');
      break;

    case '/addcoins':
      if (!arg1 || !arg2 || isNaN(Number(arg2))) {
        replyText = '❌ 格式错误！正确格式：`/addcoins 手机号 数量` 例如 `/addcoins 13800138000 50000`';
      } else {
        const u = db.users[arg1];
        if (!u) {
          replyText = `❌ 未找到手机号为 \`${arg1}\` 的玩家，请先确认手机号。`;
        } else {
          const delta = Number(arg2);
          u.coins += delta;
          saveDatabase(db);
          replyText = `💰 充值成功！玩家 **${u.nickname}** (\`${arg1}\`) 当前欢乐豆：\`${u.coins.toLocaleString()}\``;
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
          replyText = `🔑 密码重置成功！玩家 **${u.nickname}** 的新密码设为：\`${arg2}\``;
        }
      }
      break;

    default:
      replyText = `🤖 未知命令: \`${commandText}\`。发送 \`/help\` 查看 Telegram Bot 指令说明。`;
  }

  return res.json({
    ok: true,
    chat_id: chatId,
    replyText,
    authorizedPhones: db.authorizedPhones,
    usersCount: Object.keys(db.users).length,
  });
});

// ---------------- START EXPRESS SERVER ----------------
async function start() {
  const PORT = Number(process.env.PORT) || 3000;

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
    console.log(`🚀 锄大地游戏服务器 & Telegram Bot 管理后端已启动: http://0.0.0.0:${PORT}`);
  });
}

start();
