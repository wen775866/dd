const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. 智能定位游戏项目目录 (支持放置于 ~ 根目录或 dd 项目内，防止 git pull 时被覆盖)
let gameDir = __dirname;
if (fs.existsSync(path.resolve(__dirname, 'dd', 'package.json'))) {
  gameDir = path.resolve(__dirname, 'dd');
} else if (fs.existsSync(path.resolve(__dirname, 'package.json'))) {
  gameDir = __dirname;
} else if (process.env.HOME && fs.existsSync(path.resolve(process.env.HOME, 'dd', 'package.json'))) {
  gameDir = path.resolve(process.env.HOME, 'dd');
}

// 2. 自动检测并编译缺失或为空的 server.js
const serverJsPath = path.resolve(gameDir, 'server.js');
if (!fs.existsSync(serverJsPath) || fs.statSync(serverJsPath).size === 0) {
  try {
    execSync('node build-server.js', { stdio: 'inherit', cwd: gameDir });
  } catch (e) {}
}

module.exports = {
  apps: [
    {
      name: 'chudadi-game',
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
  ]
};
