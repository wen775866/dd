#!/bin/bash
# ==============================================================================
# 手机 QQ 斗地主 Web 版 - Termux 一键启动脚本
# GitHub: https://github.com/wen775866/dd.git
# ==============================================================================

set -e

echo -e "\033[33;1m[1/3] 检查并安装 Node.js 与 Git 运行环境...\033[0m"
if ! command -v node &> /dev/null; then
    echo "正在安装 Node.js..."
    pkg update -y && pkg install -y nodejs git
fi

echo -e "\033[33;1m[2/3] 检查项目依赖...\033[0m"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ] || [ ! -d "node_modules/vite-plugin-pwa" ]; then
    echo "检测到依赖更新，正在安装依赖 (npm install --legacy-peer-deps)..."
    npm install --legacy-peer-deps
fi

echo -e "\033[33;1m[3/3] 检查项目构建...\033[0m"
if [ ! -d "dist" ] || [ ! -f "dist/sw.js" ] || [ "$FORCE_REBUILD" = "1" ]; then
    echo "正在清理旧构建并重新编译静态资源 (npm run build)..."
    rm -rf dist
    npm run build
fi

PORT=${PORT:-8080}
IP_ADDR=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")

echo ""
echo -e "\033[32;1m==============================================================\033[0m"
echo -e "\033[32;1m🎮 手机 QQ 斗地主 (全局 90° 横屏版) 服务启动成功！\033[0m"
echo -e "\033[36;1m👉 本机浏览器访问: http://localhost:${PORT}\033[0m"
if [ "$IP_ADDR" != "localhost" ]; then
    echo -e "\033[36;1m👉 同 WiFi 局域网访问: http://${IP_ADDR}:${PORT}\033[0m"
fi
echo -e "\033[33;1m💡 Cloudflare Tunnel 隧道已支持 8080 端口直接穿透:\033[0m"
echo -e "\033[33;1m   cloudflared tunnel --url http://localhost:${PORT}\033[0m"
echo -e "\033[32;1m==============================================================\033[0m"
echo ""

npm run preview -- --port=$PORT --host=0.0.0.0
