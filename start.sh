#!/bin/bash
# ==============================================================================
# 手机 QQ 斗地主 Web 版 - Termux 一键启动脚本
# GitHub: https://github.com/wen775866/dd.git
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

# 自动优先读取上级根目录 (~/.env)，保护配置文件在 git pull 更新时不被覆盖
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

echo -e "\033[33;1m[1/3] 检查系统基础运行环境 (Node.js / Git / 依赖工具)...\033[0m"

# 精准检查缺失的基础软件包，避免每次重复 pkg update / pkg install
MISSING_PKGS=""
if ! command -v node &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS nodejs"
fi
if ! command -v git &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS git"
fi
if ! command -v curl &> /dev/null && ! command -v wget &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS curl"
fi
if [ -n "$PREFIX" ] && ! command -v termux-chroot &> /dev/null; then
    MISSING_PKGS="$MISSING_PKGS proot"
fi

if [ -n "$MISSING_PKGS" ]; then
    echo "⚡ 检测到缺少基础工具包: $MISSING_PKGS，正在快速安装..."
    if command -v pkg &> /dev/null; then
        pkg install -y $MISSING_PKGS
    elif command -v apt-get &> /dev/null; then
        apt-get install -y $MISSING_PKGS
    fi
else
    echo -e "\033[32;1m✅ 基础运行环境 (Node.js, Git 等) 已就绪，跳过软件包安装\033[0m"
fi

# 检查 Cloudflared 客户端（多路径智能检测，杜绝重复下载）
find_cloudflared() {
    # 1. 优先检查 PATH 中的命令
    if command -v cloudflared &> /dev/null; then
        command -v cloudflared
        return 0
    fi
    # 2. 检查 Termux / 系统常用路径
    for p in "$PREFIX/bin/cloudflared" \
             "/data/data/com.termux/files/usr/bin/cloudflared" \
             "$HOME/bin/cloudflared" \
             "$(pwd)/cloudflared" \
             "/usr/local/bin/cloudflared" \
             "/usr/bin/cloudflared"; do
        if [ -f "$p" ] && [ -x "$p" ] && [ -s "$p" ]; then
            echo "$p"
            return 0
        fi
    done
    return 1
}

CF_BIN=$(find_cloudflared || true)

# 验证已存在的 cloudflared 是否有效
if [ -n "$CF_BIN" ] && "$CF_BIN" --version &> /dev/null; then
    CF_VER=$("$CF_BIN" --version 2>/dev/null | head -n 1)
    echo -e "\033[32;1m✅ Cloudflared 已就绪 (${CF_VER})，跳过重复下载\033[0m"
    # 如果不在 PATH，但在当前目录或自定义目录，建立软链接到 $PREFIX/bin
    if ! command -v cloudflared &> /dev/null && [ -d "$PREFIX/bin" ] && [ -w "$PREFIX/bin" ]; then
        ln -sf "$CF_BIN" "$PREFIX/bin/cloudflared" 2>/dev/null || true
    fi
else
    echo "🌐 未检测到有效的 cloudflared，准备下载安装官方二进制包..."
    ARCH=$(uname -m)
    case "$ARCH" in
        aarch64|arm64)
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64";;
        armv7*|armv8l|armhf)
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm";;
        x86_64|amd64)
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";;
        i386|i686)
            URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-386";;
        *)
            echo "⚠️ 未识别架构: $ARCH，跳过自动下载"; URL="";;
    esac

    if [ -n "$URL" ]; then
        # 目标安装路径：首选 $PREFIX/bin，次选当前目录
        if [ -d "$PREFIX/bin" ] && [ -w "$PREFIX/bin" ]; then
            TARGET_BIN="$PREFIX/bin/cloudflared"
        else
            TARGET_BIN="$(pwd)/cloudflared"
        fi
        TEMP_BIN="${TARGET_BIN}.tmp"

        echo "正在从 Cloudflare 官方下载 ($ARCH)..."
        DOWNLOAD_OK=0
        if command -v curl &> /dev/null; then
            if curl -fL --progress-bar -o "$TEMP_BIN" "$URL"; then DOWNLOAD_OK=1; fi
        elif command -v wget &> /dev/null; then
            if wget -q --show-progress -O "$TEMP_BIN" "$URL"; then DOWNLOAD_OK=1; fi
        fi

        # 校验下载文件完整性（体积通常 > 20MB）
        if [ "$DOWNLOAD_OK" = "1" ] && [ -s "$TEMP_BIN" ] && [ "$(wc -c < "$TEMP_BIN")" -gt 1048576 ]; then
            chmod +x "$TEMP_BIN"
            mv -f "$TEMP_BIN" "$TARGET_BIN"
            echo -e "\033[32;1m✅ Cloudflared 下载安装成功: $TARGET_BIN\033[0m"
        else
            rm -f "$TEMP_BIN" 2>/dev/null || true
            echo "⚠️ Cloudflared 下载未完成（因网络原因），不影响本地 WiFi 局域网游玩。"
        fi
    fi
fi

echo -e "\033[33;1m[2/3] 检查项目依赖 (node_modules)...\033[0m"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
    echo "检测到缺少核心依赖，正在安装 (npm install --legacy-peer-deps)..."
    npm install --legacy-peer-deps
else
    echo -e "\033[32;1m✅ 项目依赖 (node_modules) 完整存在，跳过安装\033[0m"
fi

echo -e "\033[33;1m[3/3] 检查构建产物 (dist 与 server.js)...\033[0m"
if [ "$FORCE_REBUILD" = "1" ]; then
    echo "强制清理并重新编译 (npm run build)..."
    rm -rf dist server.js
    npm run build
elif [ -f "dist/index.html" ] && [ -f "server.js" ] && [ -s "server.js" ]; then
    echo -e "\033[32;1m✅ 构建产物 (dist/ 与 server.js) 已就绪，跳过编译\033[0m"
else
    echo "检测到缺少静态资源或服务端文件，正在执行编译构建 (npm run build)..."
    npm run build || true
fi

PORT=${PORT:-8080}

# 获取局域网 IP
IP_ADDR=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{print $7}')
if [ -z "$IP_ADDR" ]; then
    IP_ADDR=$(ip -4 addr show 2>/dev/null | grep -oE 'inet [0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | awk '{print $2}' | grep -v '^127\.' | head -n 1 || true)
fi
if [ -z "$IP_ADDR" ]; then
    IP_ADDR=$(ifconfig 2>/dev/null | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1 || true)
fi
if [ -z "$IP_ADDR" ]; then
    IP_ADDR="localhost"
fi

# Termux 防休眠锁 (保持 Android 后台活跃)
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock || true
    echo -e "\033[32;1m🔒 已激活 Termux CPU 防休眠锁 (termux-wake-lock)\033[0m"
fi

# 优化 Termux DNS 解析配置 (解决 Go 语言 / Cloudflared 解析 DNS 拒绝错误)
if [ -n "$PREFIX" ] && [ -d "$PREFIX/etc" ]; then
    mkdir -p "$PREFIX/etc" 2>/dev/null || true
    echo -e "nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 223.5.5.5\nnameserver 114.114.114.114" > "$PREFIX/etc/resolv.conf" 2>/dev/null || true
    echo -e "\033[32;1m🌐 已完成 Termux DNS 最佳配置 ($PREFIX/etc/resolv.conf)\033[0m"
    
    # 尝试在 /etc/resolv.conf 建立软链接（若有权限）
    if [ ! -f "/etc/resolv.conf" ] && [ -w "/etc" ]; then
        ln -sf "$PREFIX/etc/resolv.conf" /etc/resolv.conf 2>/dev/null || true
    fi
    if [ -f "$PREFIX/etc/tls/cert.pem" ]; then
        export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"
    fi
fi
export GODEBUG="netdns=go"
export RES_OPTIONS="nameserver 1.1.1.1"
export RESOLV_CONF="$PREFIX/etc/resolv.conf"

echo ""
echo -e "\033[32;1m==============================================================\033[0m"
echo -e "\033[32;1m🎮 手机 QQ 斗地主 Web 版 (Dou Dizhu) 启动准备就绪！\033[0m"
echo -e "\033[36;1m👉 本机浏览器访问:       http://localhost:${PORT}\033[0m"
if [ -n "$IP_ADDR" ] && [ "$IP_ADDR" != "localhost" ]; then
    echo -e "\033[36;1m👉 同 WiFi / 局域网访问:  http://${IP_ADDR}:${PORT}\033[0m"
fi
echo -e "\033[33;1m💡 推荐使用 PM2 全后台守护运行（游戏 + SSH + Cloudflare 隧道）:\033[0m"
echo -e "\033[33;1m   pm2 start ecosystem.config.cjs && pm2 save\033[0m"
echo -e "\033[32;1m==============================================================\033[0m"
echo ""

# 支持通过 `./start.sh pm2` 或 `./start.sh daemon` 直接转由 PM2 后台全守护启动
if [ "$1" = "pm2" ] || [ "$1" = "daemon" ] || [ "$1" = "--pm2" ]; then
    if command -v pm2 &> /dev/null; then
        echo "🚀 正在转由 PM2 启动全部守护服务..."
        CFG="ecosystem.config.cjs"
        if [ -f "../ecosystem.config.cjs" ]; then
            CFG="../ecosystem.config.cjs"
        elif [ -f "$HOME/ecosystem.config.cjs" ]; then
            CFG="$HOME/ecosystem.config.cjs"
        fi
        pm2 start "$CFG"
        pm2 save
        pm2 list
        exit 0
    else
        echo "⚠️ 未安装 PM2，正在以当前前台方式启动游戏服务..."
    fi
fi

# 前台启动服务
PORT=$PORT npm start
