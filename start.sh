#!/bin/bash
# ==============================================================================
# 手机 QQ 斗地主 Web 版 - Termux 一键启动脚本
# GitHub: https://github.com/wen775866/dd.git
# ==============================================================================

set -e

echo -e "\033[33;1m[1/3] 检查并安装 Node.js、Git 与 Cloudflared 运行环境...\033[0m"
if ! command -v node &> /dev/null; then
    echo "正在安装 Node.js..."
    pkg update -y && pkg install -y nodejs git net-tools wget
fi

if ! command -v cloudflared &> /dev/null; then
    echo "正在自动下载安装 cloudflared 官方二进制包..."
    pkg install -y wget
    ARCH=$(uname -m)
    case "$ARCH" in
        aarch64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64";;
        armv7l|armv8l) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm";;
        x86_64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";;
        *) echo "未识别架构: $ARCH"; URL="";;
    esac
    if [ -n "$URL" ]; then
        wget -q --show-progress -O "$PREFIX/bin/cloudflared" "$URL" && chmod +x "$PREFIX/bin/cloudflared" || true
    fi
fi

echo -e "\033[33;1m[2/3] 检查项目依赖...\033[0m"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/vite" ] || [ ! -d "node_modules/vite-plugin-pwa" ]; then
    echo "检测到依赖更新，正在安装依赖 (npm install --legacy-peer-deps)..."
    npm install --legacy-peer-deps
fi

echo -e "\033[33;1m[3/3] 检查项目构建...\033[0m"
if [ "$FORCE_REBUILD" = "1" ]; then
    echo "强制清理并重新编译 (npm run build)..."
    rm -rf dist server.js
    npm run build
elif [ ! -d "dist" ] || [ ! -f "dist/index.html" ] || [ ! -f "server.js" ]; then
    echo "检测到缺少静态资源或服务端文件，正在编译构建 (npm run build)..."
    npm run build || true
fi

PORT=${PORT:-8080}

# 优化 IP 获取：优先从路由获取局域网 IP，更兼容无 net-tools 的环境
IP_ADDR=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}')
if [ -z "$IP_ADDR" ]; then
    IP_ADDR=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")
fi

# 自动申请 Termux CPU 防休眠锁 (如果运行在 Termux 中)
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock || true
    echo -e "\033[32;1m🔒 已激活 Termux CPU 防休眠锁 (termux-wake-lock)\033[0m"
fi

# 自动配置 DNS (解决 Termux 下 Go 语言 / Cloudflared 域名解析失败)
if [ -n "$PREFIX" ] && [ -d "$PREFIX/etc" ]; then
    if [ ! -f "$PREFIX/etc/resolv.conf" ] || ! grep -q "223.5.5.5" "$PREFIX/etc/resolv.conf" 2>/dev/null; then
        echo -e "nameserver 223.5.5.5\nnameserver 114.114.114.114\nnameserver 1.1.1.1" > "$PREFIX/etc/resolv.conf" 2>/dev/null || true
        echo -e "\033[32;1m🌐 已完成 Termux DNS 最佳优化 (resolv.conf)\033[0m"
    fi
    export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem
fi
export GODEBUG=netdns=go

echo ""
echo -e "\033[32;1m==============================================================\033[0m"
echo -e "\033[32;1m🎮 欢聚锄大地 (Big Two) 服务端与 Telegram Bot 启动准备就绪！\033[0m"
echo -e "\033[36;1m👉 本机浏览器访问: http://localhost:${PORT}\033[0m"
if [ -n "$IP_ADDR" ] && [ "$IP_ADDR" != "localhost" ]; then
    echo -e "\033[36;1m👉 同 WiFi 局域网访问: http://${IP_ADDR}:${PORT}\033[0m"
fi
echo -e "\033[33;1m💡 PM2 全服务守护（同时守护游戏服务 + SSHD + Cloudflare 隧道）:\033[0m"
echo -e "\033[33;1m   pm2 start ecosystem.config.cjs\033[0m"
echo -e "\033[32;1m==============================================================\033[0m"
echo ""

PORT=$PORT npm start
