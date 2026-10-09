#!/bin/bash
# ==============================================================================
# 经典4人锄大地 Web 版 - Termux 一键启动脚本
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

# 检测系统架构与预编译 Go 二进制
GO_BIN=""
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    [ -x "./bin/server-linux-arm64" ] && GO_BIN="./bin/server-linux-arm64"
elif [ "$ARCH" = "x86_64" ]; then
    [ -x "./bin/server-linux-amd64" ] && GO_BIN="./bin/server-linux-amd64"
fi
if [ -z "$GO_BIN" ] && [ -x "./server" ]; then
    GO_BIN="./server"
fi

# 如果有预编译 Go 二进制或 Go 编译器，并且用户没有强制要求 Node.js
if ([ -n "$GO_BIN" ] || command -v go &> /dev/null) && [ "$USE_NODE" != "1" ]; then
    echo -e "\033[32;1m🚀 检测到 Go 运行模式：免安装 Node.js/npm，前端已内嵌于 Go 服务！\033[0m"
    if [ -n "$GO_BIN" ]; then
        echo -e "\033[32;1m✅ 预编译 Go 服务端已就绪: ${GO_BIN} (秒级启动)\033[0m"
    fi
else
    # 仅在需要 Node.js 模式时才检查 node 与 npm
    echo -e "\033[33;1m[1/3] 检查系统基础运行环境 (Node.js)...\033[0m"
    if ! command -v node &> /dev/null; then
        echo "⚡ 未检测到 Node.js，正在尝试安装..."
        if command -v pkg &> /dev/null; then
            pkg install -y nodejs git
        elif command -v apt-get &> /dev/null; then
            apt-get install -y nodejs git
        fi
    fi

    echo -e "\033[33;1m[2/3] 检查项目依赖 (node_modules)...\033[0m"
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
        echo "正在安装 Node 依赖 (npm install --legacy-peer-deps)..."
        npm install --legacy-peer-deps
    fi

    if [ ! -f "dist/index.html" ] && [ ! -d "web" ]; then
        echo "⚡ 正在构建前端 (npm run build)..."
        npm run build || true
    fi
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
echo -e "\033[32;1m🎮 经典4人锄大地 Web 版 (Big Two) 启动准备就绪！\033[0m"
echo -e "\033[36;1m👉 本机浏览器访问:       http://localhost:${PORT}\033[0m"
if [ -n "$IP_ADDR" ] && [ "$IP_ADDR" != "localhost" ]; then
    echo -e "\033[36;1m👉 同 WiFi / 局域网访问:  http://${IP_ADDR}:${PORT}\033[0m"
fi
echo -e "\033[33;1m💡 提示: 您可以自行全局安装 PM2 并通过 pm2 start ecosystem.config.cjs 运行\033[0m"
echo -e "\033[32;1m==============================================================\033[0m"
echo ""

# 启动服务 (优先使用预编译的 Go 服务端，也支持 USE_NODE=1 使用 Node.js 启动)
if [ -n "$GO_BIN" ] && [ -x "$GO_BIN" ] && [ "$USE_NODE" != "1" ]; then
    echo -e "\033[32;1m⚡ 正在以 Go 服务端运行 (${GO_BIN})...\033[0m"
    PORT=$PORT $GO_BIN
elif command -v go &> /dev/null && [ "$USE_NODE" != "1" ]; then
    echo "⚡ 正在以 Go 服务模式运行 (go run main.go)..."
    PORT=$PORT go run main.go
else
    PORT=$PORT npm start
fi
