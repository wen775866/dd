const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// 1. 智能定位游戏项目目录 (支持放置于 ~ 根目录或 dd 项目内，防止 git pull 时被覆盖)
let gameDir = __dirname;
if (fs.existsSync(path.resolve(__dirname, 'dd', 'package.json'))) {
  // ecosystem.config.cjs 放置于 Termux/用户根目录 (~)，游戏位于 ~/dd
  gameDir = path.resolve(__dirname, 'dd');
} else if (fs.existsSync(path.resolve(__dirname, 'package.json'))) {
  // ecosystem.config.cjs 放置于项目根目录内
  gameDir = __dirname;
} else if (process.env.HOME && fs.existsSync(path.resolve(process.env.HOME, 'dd', 'package.json'))) {
  gameDir = path.resolve(process.env.HOME, 'dd');
}

// 2. 自动检测并编译缺失或为空的 server.js，防止 PM2 报错 Error: Script not found: server.js
const serverJsPath = path.resolve(gameDir, 'server.js');
if (!fs.existsSync(serverJsPath) || fs.statSync(serverJsPath).size === 0) {
  console.log('⚡ 检测到 server.js 尚未生成，正在自动进行编译 (node build-server.js)...');
  try {
    execSync('node build-server.js', { stdio: 'inherit', cwd: gameDir });
  } catch (e) {
    console.error('❌ 自动编译 server.js 失败:', e.message);
  }
}

// 3. 优先加载上级目录 (~/.env) 的配置文件，防止 git checkout . / git pull 时破坏配置
const envPaths = [
  path.resolve(process.env.HOME || '', '.env'),
  path.resolve('/data/data/com.termux/files/home/.env'),
  path.resolve(gameDir, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(gameDir, '.env')
];

for (const envPath of envPaths) {
  if (envPath && fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

// 4. 环境判定：严格区分 Termux 与常规 Linux / Serv00 环境
const isTermux = !!process.env.PREFIX || fs.existsSync('/data/data/com.termux/files/usr');
const termuxPrefix = process.env.PREFIX || '/data/data/com.termux/files/usr';

// 5. 核心游戏应用 (全平台通用：Termux / Linux / Serv00 均只保证游戏极致稳定运行)
const apps = [
  {
    name: 'ddz-game',
    script: serverJsPath,
    cwd: gameDir,
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 8080
    },
    max_memory_restart: '200M',
    autorestart: true,
    restart_delay: 3000,
    watch: false
  }
];

// 6. Cloudflare Tunnel 隧道托管处理
// 若在纯 Linux 或 Serv00 上，且未配置 Token 或禁用隧道，则完全不启动，避免进程崩溃
const tunnelToken = (process.env.CLOUDFLARE_TUNNEL_TOKEN || process.env.TUNNEL_TOKEN || process.env.CLOUDFLARED_TOKEN || '').trim();
const shouldEnableTunnel = process.env.DISABLE_TUNNEL !== 'true' && (isTermux || tunnelToken || process.env.ENABLE_TUNNEL === 'true');

if (shouldEnableTunnel) {
  const candidateCloudflared = [
    path.join(termuxPrefix, 'bin/cloudflared'),
    path.resolve(gameDir, 'cloudflared'),
    path.resolve(__dirname, 'cloudflared'),
    path.join(process.env.HOME || '', 'bin/cloudflared'),
    '/data/data/com.termux/files/usr/bin/cloudflared',
    '/usr/local/bin/cloudflared',
    '/usr/bin/cloudflared'
  ];

  let cloudflaredBin = null;
  for (const p of candidateCloudflared) {
    if (p && fs.existsSync(p)) {
      try {
        if (fs.statSync(p).size > 1000) {
          cloudflaredBin = p;
          break;
        }
      } catch (_) {}
    }
  }

  // 只有当系统中找到了可执行的 cloudflared 二进制时才注册，防止在无隧道的 Linux/Serv00 上报错不断重启
  if (cloudflaredBin) {
    const tunnelArgs = tunnelToken
      ? `tunnel --edge-ip-version 4 --protocol http2 run --token ${tunnelToken}`
      : `tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:${process.env.PORT || 8080}`;

    const cfEnv = {};

    // 针对 Termux 特别优化：检测 termux-chroot 解决 Android libc 导致的 DNS 连接被拒 (connection refused)
    let cfScript = cloudflaredBin;
    let cfFinalArgs = tunnelArgs;

    if (isTermux) {
      const candidateChroot = [
        path.join(termuxPrefix, 'bin/termux-chroot'),
        '/data/data/com.termux/files/usr/bin/termux-chroot'
      ];
      let termuxChrootBin = null;
      for (const p of candidateChroot) {
        if (p && fs.existsSync(p)) {
          termuxChrootBin = p;
          break;
        }
      }

      // 确保 Termux 中 DNS 配置文件存在
      const dnsConfig = 'nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 223.5.5.5\nnameserver 114.114.114.114\n';
      const termuxResolvConf = path.join(termuxPrefix, 'etc/resolv.conf');
      try {
        fs.mkdirSync(path.dirname(termuxResolvConf), { recursive: true });
        fs.writeFileSync(termuxResolvConf, dnsConfig);
      } catch (_) {}

      cfEnv.GODEBUG = 'netdns=go';
      cfEnv.RESOLV_CONF = termuxResolvConf;

      const certPath = path.join(termuxPrefix, 'etc/tls/cert.pem');
      if (fs.existsSync(certPath)) {
        cfEnv.SSL_CERT_FILE = certPath;
      }

      if (termuxChrootBin) {
        cfScript = termuxChrootBin;
        cfFinalArgs = `${cloudflaredBin} ${tunnelArgs}`;
      }
    }

    apps.push({
      name: 'cf-tunnel',
      script: cfScript,
      args: cfFinalArgs,
      cwd: gameDir,
      env: cfEnv,
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    });
  }
}

// 7. SSHD 远程访问守护：
// 仅在 Termux 环境且用户在 ~/.env 中显式声明 ENABLE_SSHD=true 时才尝试托管
// 在常规 Linux 或 Serv00 上绝对不托管 sshd，避免权限不足或端口与系统级冲突
if (isTermux && process.env.ENABLE_SSHD === 'true') {
  const candidateSshd = [
    path.join(termuxPrefix, 'bin/sshd'),
    '/data/data/com.termux/files/usr/bin/sshd'
  ];
  let sshdBin = null;
  for (const p of candidateSshd) {
    if (p && fs.existsSync(p)) {
      sshdBin = p;
      break;
    }
  }

  // 检查 8022 端口是否已被手动启动的 sshd 占用
  let isPort8022Busy = false;
  try {
    const netInfo = execSync('netstat -tuln 2>/dev/null || ss -tuln 2>/dev/null || true').toString();
    if (netInfo.includes(':8022 ') || netInfo.includes(':8022\n')) {
      isPort8022Busy = true;
    }
  } catch (_) {}

  if (sshdBin && !isPort8022Busy) {
    // 自动补齐主机密钥
    const hostKeyPath = path.join(termuxPrefix, 'etc/ssh/ssh_host_rsa_key');
    if (!fs.existsSync(hostKeyPath)) {
      try {
        execSync('ssh-keygen -A 2>/dev/null || true');
      } catch (_) {}
    }

    apps.push({
      name: 'sshd',
      script: sshdBin,
      args: '-D',
      cwd: gameDir,
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    });
  }
}

module.exports = {
  apps
};
