const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// 自动检测并编译缺失或为空的 server.js，防止 PM2 报错 Error: Script not found: server.js
const serverJsPath = path.resolve(__dirname, 'server.js');
if (!fs.existsSync(serverJsPath) || fs.statSync(serverJsPath).size === 0) {
  console.log('⚡ 检测到 server.js 尚未生成，正在自动进行编译 (node build-server.js)...');
  try {
    execSync('node build-server.js', { stdio: 'inherit', cwd: __dirname });
  } catch (e) {
    console.error('❌ 自动编译 server.js 失败:', e.message);
  }
}

// 自动加载根目录 (~/.env 或 ../.env) 或当前目录下的 .env 配置文件
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

const dnsFlags = '--dns 1.1.1.1 --dns 8.8.8.8';
const tunnelArgs = tunnelToken
  ? `tunnel --edge-ip-version 4 --protocol http2 ${dnsFlags} run --token ${tunnelToken}`
  : `tunnel --edge-ip-version 4 --protocol http2 ${dnsFlags} --url http://localhost:8080`;

// 检测 Termux 及常用环境中的二进制路径
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

// 自动确保 Termux 及 Linux 环境下有可用的 DNS 解析配置 (Android Go 程序默认常尝试查询 127.0.0.1:53 或 [::1]:53 导致 connection refused)
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

// 确保 Android Termux 下如果 /etc 不存在软链接，尽量建好 $PREFIX/etc/resolv.conf
const termuxResolvConf = path.join(termuxPrefix, 'etc/resolv.conf');
try {
  if (fs.existsSync(termuxResolvConf)) {
    fs.writeFileSync(termuxResolvConf, dnsConfig);
  }
} catch (_) {}

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
      args: '-D', // 前台运行，便于 PM2 进程守护
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
      env: {
        GODEBUG: 'netdns=go',
        RES_OPTIONS: 'nameserver 1.1.1.1',
        RESOLV_CONF: path.join(termuxPrefix, 'etc/resolv.conf'),
        SSL_CERT_FILE: fs.existsSync(path.join(termuxPrefix, 'etc/tls/cert.pem'))
          ? path.join(termuxPrefix, 'etc/tls/cert.pem')
          : ''
      },
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    }
  ]
};
