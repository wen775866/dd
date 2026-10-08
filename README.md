# 🔨 欢聚锄大地 (Big Two) · Web 横屏独立版 · 部署与常驻守护指南

> 本项目已全新升级重构为经典 4 人 **锄大地 (Big Two / Big 2)** Web 网页版，采用 **全局固定旋转 90 度横屏** 架构。手机竖屏打开即自动呈现沉浸式 4 人牌桌视界，支持 52 张标准扑克牌规则（老二最大、3最小，首出方块3）、五大五张牌型压制（同花顺/铁支/葫芦/同花/顺子）、双倍与关门三倍惩罚、实时麦克风语音对讲、五大方言配音、PWA 渐进式独立桌面应用以及 Termux 局域网 / SSHD 远程管理 / PM2 进程守护 / Cloudflare Tunnel 公网隧道穿透。
>
> 🔗 **GitHub 仓库地址**：[https://github.com/wen775866/dd.git](https://github.com/wen775866/dd.git)

---

## 📖 多平台独立手把手部署教程（按系统查阅）

针对不同平台的系统架构与权限特性，已分别编写了三份专项详细教程：

- 📱 **[Termux 手机完整部署教程 (docs/deploy_termux.md)](docs/deploy_termux.md)**：包含 Termux 系统更新、安装 Node.js/Git、安装 cloudflared 隧道、DNS 报错修复、GitHub 代码克隆、依赖安装、构建游戏与 PM2 进程守护配置。
- 🐧 **[Linux 服务器部署教程 (docs/deploy_linux.md)](docs/deploy_linux.md)**：包含 Ubuntu/Debian/CentOS 安装 Node.js 20、官方源安装 cloudflared、Systemd 服务托管、PM2 开机自启、Nginx 反代与 WebSocket 配置。
- 🌐 **[Serv00 免费虚拟主机部署教程 (docs/deploy_serv00.md)](docs/deploy_serv00.md)**：包含开启后台运行权限、自定义端口预约、FreeBSD 架构 cloudflared 适配、无 root 权限 PM2 守护、Crontab 保活以及自带域名反代。

---

## 📱 核心功能特性

- 🔨 **经典 4 人锄大地对局**：正宗 52 张牌规则，点数 `2 > A > K ... > 3`，花色 `♠ > ♥ > ♣ > ♦`，首局持有 `♦3 (方块3)` 玩家必须优先首出。
- 💥 **五大五张牌型压制层级**：同花顺 (Straight Flush) > 铁支 (Four of a Kind) > 葫芦 (Full House) > 同花 (Flush) > 顺子 (Straight)，高阶牌型可直接跨级压制！
- 💥 **终盘关门与双倍/三倍暴击惩罚**：
  - 剩 10~12 张牌：触发 **双倍惩罚 (张数x2)**。
  - 剩 13 张一张未出：触发 **关门三倍暴击 (39倍底分扣除)**！
  - 胜者以老二清牌倍数额外x2，以铁支/同花顺清牌倍数额外x4！
- 🎙️ **实时语音对讲与对讲机**：支持真实麦克风按住说话 (Hold to Talk)、实时声波频谱动效、语音消息回放与电脑 AI 智能语音互动回应。
- 🔊 **全套真人语音与五大方言音效**：支持【经典普通话 / 川味麻辣 / 粤语情怀 / 东北豪爽 / 萌系二次元】配音包。
- 📲 **PWA 渐进式独立应用**：支持一键“安装至桌面主屏幕”，免浏览器地址栏全屏独立启动，支持离线单机运行。
- 🔄 **全局固定 90° 旋转横屏**：无需开启手机系统自动旋转，打开网页即刻铺满屏幕，零黑边、零滚动条。
- 🛡️ **双重常驻保护机制**：同时支持 `.bashrc` 终端自动开机恢复与 `PM2` 集群常驻，彻底解决 Node.js 未捕获异常、网络超时及 Cloudflare 域名解析崩溃。

---

## ⚡ Termux 自动化环境防护与启动（推荐 `.bashrc` 写入）

为了确保每次打开 Termux 时，自动修正 Go 语言与 Cloudflared 的 DNS 域名解析失败报错、自动拉起 SSHD 远程服务、并自动建立 Cloudflare 公网隧道，直接在 Termux 中粘贴并运行以下配置（**隧道 Token 自动读取根目录 `.env` 文件，不写入任何代码**）：

```bash
cat << 'EOF' >> ~/.bashrc

# 1. 自动配置 DNS (解决 Termux 下 Go 语言与 Cloudflared 域名解析报错)
mkdir -p $PREFIX/etc
echo -e "nameserver 223.5.5.5\nnameserver 114.114.114.114\nnameserver 1.1.1.1" > $PREFIX/etc/resolv.conf

# 2. 自动启动 SSH 服务 (sshd)
if ! pgrep -x "sshd" >/dev/null; then
    sshd
    echo "SSH 服务 (sshd) 已自动启动，默认端口: 8022"
fi

# 3. 自动启动 Cloudflared 隧道 (从根目录 ~/.env 或 dd/.env 自动读取 Token)
if ! pgrep -f cloudflared >/dev/null; then
    export SSL_CERT_FILE=$PREFIX/etc/tls/cert.pem
    export GODEBUG=netdns=go
    
    ENV_FILE="$HOME/.env"
    [ ! -f "$ENV_FILE" ] && ENV_FILE="$(pwd)/.env"
    CF_TOKEN=""
    if [ -f "$ENV_FILE" ]; then
        CF_TOKEN=$(grep -E '^(CLOUDFLARE_TUNNEL_TOKEN|TUNNEL_TOKEN)=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d ' ')
    fi

    if [ -n "$CF_TOKEN" ]; then
        termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token "$CF_TOKEN" > /dev/null 2>&1 &
        echo "Cloudflare Tunnel 专用隧道 (已使用 .env Token) 启动成功"
    else
        termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080 > /dev/null 2>&1 &
        echo "Cloudflare Tunnel 免费临时隧道 启动成功"
    fi
fi
EOF

# 使配置立即生效
source ~/.bashrc
```

---

## 🚀 Termux 手机全服务极速部署与常驻指南

### 🆕 重新安装 / 新机首次安装 Termux 快速上手 (1 分钟极速流程)

如果您是**重新安装了 Termux** 或在**新手机上初次安装**，直接复制并运行以下命令即可完成全局环境安装、代码拉取与一键启动：

```bash
# 1. 更新软件源与软件包 (自动同意所有 y/n 提示)
pkg update -y && yes | pkg upgrade -y

# 2. 安装 git, nodejs, openssh, wget 等基础依赖
pkg install -y git nodejs openssh wget net-tools termux-exec

# 3. 自动下载安装 cloudflared 官方最新二进制文件 (解决 pkg install cloudflared 无法安装问题)
ARCH=$(uname -m) && case "$ARCH" in aarch64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64";; armv7l|armv8l) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm";; x86_64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";; *) echo "未识别的架构: $ARCH"; exit 1;; esac && wget -q --show-progress -O $PREFIX/bin/cloudflared "$URL" && chmod +x $PREFIX/bin/cloudflared && echo -e "\nCloudflared 安装成功！当前版本：" && cloudflared --version

# 4. 激活 CPU 防休眠锁 (防止手机锁屏挂起后台)
termux-wake-lock

# 5. 克隆 GitHub 仓库并进入项目目录
git clone https://github.com/wen775866/dd.git
cd dd

# 6. 赋予启动脚本可执行权限并运行
chmod +x start.sh
./start.sh
```

> 💡 **自动部署说明**：
> `start.sh` 启动脚本会自动检测并自动执行 `npm install --legacy-peer-deps`、自动运行 `npm run build` 预编译生成 `server.js`（彻底避开 tsx ARM64 崩溃）、自动检测补全 `cloudflared`、自动修复 Termux DNS 配置并拉起游戏服务！

---

### 第一步：安装 Termux 必备软件包

打开 Termux，一次性安装 Node.js、Git、OpenSSH（用于远程管理）和 Cloudflare Tunnel：

```bash
# 1. 更新软件源并安装基础依赖
pkg update -y && pkg install -y git nodejs openssh wget net-tools termux-exec

# 2. 一键安装 Cloudflare Tunnel (直接从 Cloudflare 官方 GitHub Release 下载二进制包)
ARCH=$(uname -m) && case "$ARCH" in aarch64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64";; armv7l|armv8l) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm";; x86_64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64";; *) echo "未识别的架构: $ARCH"; exit 1;; esac && wget -q --show-progress -O $PREFIX/bin/cloudflared "$URL" && chmod +x $PREFIX/bin/cloudflared

# 3. 激活 Termux CPU 防休眠锁（极其重要，防止手机锁屏休眠导致服务暂停）
termux-wake-lock
```

> **国内镜像加速（可选）**：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

---

### 第二步：拉取项目代码与配置根目录 `.env` 文件

隧道 Token 以及 Telegram Bot 配置统一放置在上一级根目录 `~/.env` 或项目根目录 `dd/.env` 中：

```bash
# 克隆仓库并进入目录
git clone https://github.com/wen775866/dd.git
cd dd

# 配置根目录环境变量 (.env)
nano ~/.env
```

在 `~/.env` 中按需填入信息（支持 Telegram Bot 和 Cloudflare Tunnel Token）：
```env
# 1. 网页服务端口
PORT=8080

# 2. Telegram 机器人 (选填)
BOT_ID="你的_BOT_ID"
BOT_TOKEN="你的_BOT_TOKEN"

# 3. Cloudflare Tunnel 隧道 Token (选填，不填则自动分配免费临时域名)
CLOUDFLARE_TUNNEL_TOKEN="你的_CLOUDFLARE_TUNNEL_TOKEN"
```

---

### 第三步：编译项目与预构建（防止 Exit 139 段错误）

```bash
# 1. 安装项目依赖
npm install --legacy-peer-deps

# 2. 编译打包（自动将 server.ts 预编译为 pure JS server.js，彻底绕过 Termux ARM64 tsx 内存崩溃）
npm run build

# 3. 全局安装 PM2 进程守护工具（可选，推荐）
npm install -g pm2
```

---

### 第四步：配置 SSHD 远程 SSH 管理（可选但推荐）

在 Termux 中开启 SSHD 后，你可以用电脑（如 PuTTY、Xshell、VSCode 或 Mac 终端）远程登录手机进行控制：

```bash
# 1. 设置 Termux 当前用户的 SSH 登录密码
passwd

# 2. 获取当前 Termux 的用户名与 IP
whoami
ifconfig
```

*Termux 的 SSHD 默认监听在 **`8022`** 端口。*  
电脑端连接命令：`ssh -p 8022 <whoami显示的用户名>@<手机局域网IP>`

---

### 第五步：一键启动全服务守护（一键启动脚本 或 PM2 集群）

#### 方式一：运行项目内置启动脚本 (`start.sh`)

```bash
bash start.sh
```
该脚本会自动：
1. 检查并补全 Node.js 与 Git 环境
2. 自动生成并优化 Termux `$PREFIX/etc/resolv.conf` DNS 文件
3. 申请 `termux-wake-lock` 防休眠锁
4. 运行基于纯 Node.js 的 `server.js`，展示局域网 IP 与访问网址。

#### 方式二：使用 PM2 三合一集群守护 (`ecosystem.config.cjs`)

```bash
# 在 dd 根目录下执行：
pm2 start ecosystem.config.cjs

# 保存 PM2 启动状态
pm2 save
```

#### 守护进程说明 (`ecosystem.config.cjs`)：
1. **`ddz-game`**：游戏生产服务器（监听 `8080` 端口，附带 200MB 内存上限阈值，超限自动重启，防系统强杀）。
2. **`termux-sshd`**：Termux SSH 远程终端守护（监听 `8022` 端口，掉线自动拉起）。
3. **`cf-tunnel`**：Cloudflare Tunnel 公网免端口穿透（自动读取根目录 `.env` 中的 `CLOUDFLARE_TUNNEL_TOKEN`，无 Token 时开启免费临时穿透，集成 `GODEBUG=netdns=go` 和 DNS 防解析崩溃设置）。

---

## 🛠️ PM2 服务常用运维管理命令

| 操作需求 | 执行命令 |
| :--- | :--- |
| **查看所有服务运行状态** | `pm2 status` |
| **查看实时日志 (全部服务)** | `pm2 logs` |
| **仅查看游戏服务端日志** | `pm2 logs ddz-game` |
| **仅查看 Cloudflare 隧道公网链接** | `pm2 logs cf-tunnel` |
| **仅查看 SSHD 状态** | `pm2 logs termux-sshd` |
| **重启所有守护服务** | `pm2 restart all` |
| **停止所有服务** | `pm2 stop all` |

---

## 🌐 访问方式与联机指南

1. **本机浏览器访问**：
   打开手机自带浏览器输入：`http://localhost:8080`

2. **同一 WiFi 局域网联机**：
   * 在 Termux 中执行 `ifconfig` 或 `ip route` 获取局域网 IP（例如 `192.168.1.100`）。
   * 局域网设备访问：`http://192.168.1.100:8080`

3. **Internet 互联网公网联机**：
   * 通过 Cloudflare Tunnel 生成的 `https://xxxxxx.trycloudflare.com` 或你自有的域名链接畅玩。

---

## ❓ 常见问题与原理排查 (FAQ)

1. **问：为什么 Cloudflared 报错 `failed to connect to origin` 或 DNS 解析报错？**
   - 答：Termux 环境下默认缺乏完整的 `/etc/resolv.conf`，导致 Go 语言标准库的网络解析器失败。在 `~/.bashrc` 或 `start.sh` 中配置 `nameserver 223.5.5.5` 以及导出环境变量 `export GODEBUG=netdns=go` 即可解决。

2. **问：Termux 切后台或锁屏后，网页突然无法连接？**
   - 答：请务必在 Termux 中执行 `termux-wake-lock` 开启防休眠锁。此外，请在手机系统【设置】->【电池/后台管理】中将 Termux 设置为“允许后台高耗电/无限制”。

3. **问：端口被占用报错 `EADDRINUSE: address already in use`？**
   - 答：通过 PM2 重启，或者执行以下命令强制清理占用端口：
     ```bash
     fuser -k 8080/tcp
     ```

---

*祝您开局一把连炸，天天当雀圣！* 🎴✨
