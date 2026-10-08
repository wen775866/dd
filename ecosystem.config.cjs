const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// 自动检测并编译缺失的 server.js，防止 PM2 报错 Error: Script not found: server.js
const serverJsPath = path.resolve(__dirname, 'server.js');
if (!fs.existsSync(serverJsPath)) {
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

const tunnelArgs = tunnelToken
  ? `tunnel --edge-ip-version 4 --protocol http2 run --token ${tunnelToken}`
  : 'tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080';

module.exports = {
  apps: [
    {
      name: 'ddz-game',
      script: 'server.js',
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
      name: 'termux-sshd',
      script: 'sshd',
      args: '-D', // 前台运行，便于 PM2 进程守护
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    },
    {
      name: 'cf-tunnel',
      script: 'cloudflared',
      args: tunnelArgs,
      env: {
        GODEBUG: 'netdns=go',
        SSL_CERT_FILE: process.env.PREFIX ? `${process.env.PREFIX}/etc/tls/cert.pem` : ''
      },
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    }
  ]
};
