#!/bin/bash
# ==============================================================================
# 手机 QQ 斗地主 Web 版 - Termux 一键启动脚本
# ==============================================================================

set -e

# 进入脚本所在项目根目录
cd "$(dirname "$0")"

# 1. 规范化并补全 Termux 环境变量与用户配置
PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
if [ -d "$PREFIX/bin" ] && [[ ":$PATH:" != *":$PREFIX/bin:"* ]]; then
    export PATH="$PREFIX/bin:$PATH"
fi
if [ -d "$HOME/bin" ] && [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    export PATH="$HOME/bin:$PATH"
fi

# 自动优先读取上级根目录 (~/.env)
if [ -f "../.env" ]; then
    set -a
    source "../.env" 2>/dev/null || true
    set +a
elif [ -f "$HOME/.env" ]; then
    set -a
    source "$HOME/.env" 2>/dev/null || true
    set +a
elif [ -f ".env" ]; then
    set -a
    source ".env" 2>/dev/null || true
    set +a
fi

echo -e "\033[33;1m[1/3] 检查系统基础运行环境 (Node.js / Git)...\033[0m"

MISSING_PKGS=""
if ! command -v node &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS nodejs"
fi
if ! command -v git &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS git"
fi

if [ -n "$MISSING_PKGS" ]; then
    echo "⚡ 检测到缺少基础工具包: $MISSING_PKGS，正在快速安装..."
    if command -v pkg &> /dev/null; then
        pkg install -y $MISSING_PKGS
    elif command -v apt-get &> /dev/null; then
        apt-get install -y $MISSING_PKGS
    fi
else
    echo -e "\033[32;1m✅ 基础运行环境已就绪\033[0m"
fi

echo -e "\033[33;1m[2/3] 检查项目依赖 (node_modules)...\033[0m"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
    echo "检测到缺少核心依赖，正在安装 (npm install --legacy-peer-deps)..."
    npm install --legacy-peer-deps
else
    echo -e "\033[32;1m✅ 项目依赖完整存在，跳过安装\033[0m"
fi

echo -e "\033[33;1m[3/3] 检查构建产物 (dist 与 server.js)...\033[0m"
if [ -f "dist/index.html" ] && [ -f "server.js" ] && [ -s "server.js" ]; then
    echo -e "\033[32;1m✅ 构建产物已就绪，跳过编译\033[0m"
else
    echo "检测到缺少静态资源或服务端文件，正在执行编译构建..."
    npm run build || true
fi

PORT=${PORT:-8080}

# 获取局域网 IP
IP_ADDR=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7}')
if [ -z "$IP_ADDR" ]; then
    IP_ADDR=$(ip -4 addr show 2>/dev/null | grep -oE 'inet [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | awk '{print $2}' | grep -v '^127\.' | head -n 1 || true)
fi
if [ -z "$IP_ADDR" ]; then
    IP_ADDR="localhost"
fi

# Termux 防休眠锁
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock || true
    echo -e "\033[32;1m🔒 已激活 Termux CPU 防休眠锁 (termux-wake-lock)\033[0m"
fi

echo ""
echo -e "\033[32;1m==============================================================\033[0m"
echo -e "\033[32;1m🎮 手机 QQ 斗地主 Web 版启动准备就绪！\033[0m"
echo -e "\033[36;1m👉 本机浏览器访问:       http://localhost:${PORT}\033[0m"
if [ -n "$IP_ADDR" ] && [ "$IP_ADDR" != "localhost" ]; then
    echo -e "\033[36;1m👉 同 WiFi / 局域网访问:  http://${IP_ADDR}:${PORT}\033[0m"
fi
echo -e "\033[33;1m💡 提示: 您可以自行全局安装 PM2 并通过 pm2 start ecosystem.config.cjs 运行\033[0m"
echo -e "\033[32;1m==============================================================\033[0m"
echo ""

# 前台启动服务
PORT=$PORT npm start
