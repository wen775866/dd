const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// 1. 自动检测并编译缺失或为空的 server.js，防止 PM2 报错 Error: Script not found: server.js
const serverJsPath = path.resolve(__dirname, 'server.js');
if (!fs.existsSync(serverJsPath) || fs.statSync(serverJsPath).size === 0) {
  console.log('⚡ 检测到 server.js 尚未生成，正在自动进行编译 (node build-server.js)...');
  try {
    execSync('node build-server.js', { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.error('❌ 自动编译 server.js 失败:', e.message);
  }
}

// 2. 自动加载根目录 (~/.env 或 ../.env) 或当前目录下的 .env 配置文件
const envPaths = [
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(process.env.HOME || '/data/data/com.termux/files/home', '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const tunnelToken = (process.env.CLOUDFLARE_TUNNEL_TOKEN || process.env.TUNNEL_TOKEN || process.env.CLOUDFLARED_TOKEN || '').trim();

// 修正：移除 cloudflared CLI 不支持的 --dns 标记，靠 GODEBUG 与 resolv.conf 处理 DNS
const tunnelArgs = tunnelToken
  ? `tunnel --edge-ip-version 4 --protocol http2 run --token ${tunnelToken}`
  : `tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080`;

// 3. 检测 Termux 及常用环境中的二进制路径
const termuxPrefix = process.env.PREFIX || '/data/data/com.termux/files/usr';

const candidateSshd = [
  path.join(termuxPrefix, 'bin/sshd'),
  '/data/data/com.termux/files/usr/bin/sshd',
  '/usr/sbin/sshd',
  '/usr/bin/sshd'
];
let sshdBin = 'sshd';
for (const p of candidateSshd) {
  if (p && fs.existsSync(p)) {
    sshdBin = p;
    break;
  }
}

const candidateCloudflared = [
  path.join(termuxPrefix, 'bin/cloudflared'),
  path.resolve(__dirname, 'cloudflared'),
  path.join(process.env.HOME || '/data/data/com.termux/files/home', 'bin/cloudflared'),
  '/data/data/com.termux/files/usr/bin/cloudflared',
  '/usr/local/bin/cloudflared',
  '/usr/bin/cloudflared'
];
let cloudflaredBin = 'cloudflared';
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

// 4. 自动确保 Termux 环境下有可用的 DNS 解析配置
const dnsConfig = 'nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 223.5.5.5\nnameserver 114.114.114.114\n';
const possibleResolvPaths = [
  path.join(termuxPrefix, 'etc/resolv.conf'),
  '/etc/resolv.conf',
  path.resolve(process.env.HOME || '/data/data/com.termux/files/home', '.resolv.conf')
];

for (const resolvConfPath of possibleResolvPaths) {
  try {
    if (!fs.existsSync(resolvConfPath) || fs.readFileSync(resolvConfPath, 'utf8').trim() === '') {
      fs.mkdirSync(path.dirname(resolvConfPath), { recursive: true });
      fs.writeFileSync(resolvConfPath, dnsConfig);
    }
  } catch (_) {}
}

const termuxResolvConf = path.join(termuxPrefix, 'etc/resolv.conf');
try {
  if (fs.existsSync(termuxResolvConf)) {
    fs.writeFileSync(termuxResolvConf, dnsConfig);
  }
} catch (_) {}

// 构建 cloudflared 环境变量
const cfEnv = {
  GODEBUG: 'netdns=go',
  RESOLV_CONF: termuxResolvConf
};
const certPath = path.join(termuxPrefix, 'etc/tls/cert.pem');
if (fs.existsSync(certPath)) {
  cfEnv.SSL_CERT_FILE = certPath;
}

module.exports = {
  apps: [
    {
      name: 'ddz-game',
      script: path.resolve(__dirname, 'server.js'),
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8080
      },
      max_memory_restart: '200M',
      autorestart: true,
      restart_delay: 3000,
      watch: false
    },
    {
      name: 'sshd',
      script: sshdBin,
      args: '-D', // 前台运行模式，以便 PM2 进行进程守护
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    },
    {
      name: 'cf-tunnel',
      script: cloudflaredBin,
      args: tunnelArgs,
      cwd: __dirname,
      env: cfEnv,
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    }
  ]
};
