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

const tunnelArgs = tunnelToken
  ? `tunnel --edge-ip-version 4 --protocol http2 run --token ${tunnelToken}`
  : 'tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080';

// 检测 Termux 环境中的二进制路径
const termuxPrefix = process.env.PREFIX || '/data/data/com.termux/files/usr';
const sshdBin = fs.existsSync(path.join(termuxPrefix, 'bin/sshd'))
  ? path.join(termuxPrefix, 'bin/sshd')
  : 'sshd';

const cloudflaredBin = fs.existsSync(path.join(termuxPrefix, 'bin/cloudflared'))
  ? path.join(termuxPrefix, 'bin/cloudflared')
  : 'cloudflared';

// 自动确保 Termux 环境下有可用的 DNS 解析配置 (Android Go 程序默认常尝试查询 127.0.0.1:53 或 [::1]:53 导致 connection refused)
const resolvConfPath = path.join(termuxPrefix, 'etc/resolv.conf');
try {
  if (!fs.existsSync(resolvConfPath) || fs.readFileSync(resolvConfPath, 'utf8').trim() === '') {
    fs.mkdirSync(path.dirname(resolvConfPath), { recursive: true });
    fs.writeFileSync(resolvConfPath, 'nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 223.5.5.5\n');
  }
} catch (e) {
  // 忽略只读等权限错误
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
        SSL_CERT_FILE: process.env.PREFIX ? `${process.env.PREFIX}/etc/tls/cert.pem` : ''
      },
      autorestart: true,
      restart_delay: 5000,
      exec_mode: 'fork'
    }
  ]
};
