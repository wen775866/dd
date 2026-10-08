# 📱 Termux 手机部署完整手把手教程

> 本教程专为 Android 手机端 Termux 环境设计，详细指导如何从零开始配置环境、安装必要软件包、配置与启动 Cloudflare Tunnel 公网隧道、拉取项目代码、编译运行游戏以及配置 PM2 实现后台持久化守护。

---

## 目录
1. [第一步：系统更新与基础软件包安装](#第一步系统更新与基础软件包安装)
2. [第二步：安装与配置 Cloudflare Tunnel 隧道](#第二步安装与配置-cloudflare-tunnel-隧道)
3. [第三步：启动隧道及常见错误解决（DNS/权限等）](#第三步启动隧道及常见错误解决dns权限等)
4. [第四步：从 GitHub 拉取代码与安装项目依赖](#第四步从-github-拉取代码与安装项目依赖)
5. [第五步：编译与启动游戏服务](#第五步编译与启动游戏服务)
6. [第六步：安装 PM2 进程守护与自动开机常驻](#第六步安装-pm2-进程守护与自动开机常驻)

---

## 第一步：系统更新与基础软件包安装

打开 Termux 终端后，依次执行以下命令：

### 1.1 换源与更新软件包列表
```bash
# 遇到换源提示可选择镜像节点（如国内可选择 Mirrors of BFSU、TUNA 等）
termux-change-repo

# 更新基础软件包（遇到询问默认按回车 Y 即可）
pkg update -y && pkg upgrade -y
```

### 1.2 安装核心软件包
运行游戏服务端、代码拉取以及远程维护需要以下软件：
```bash
# 安装 Node.js (v18+)、Git、Curl、Wget、OpenSSH (远程连接) 以及 proot
pkg install -y nodejs git curl wget openssh proot
```

### 1.3 开启手机后台保活（防止切后台被系统杀死）
```bash
# 获取手机唤醒锁，防止 Termux 在后台休眠
termux-wake-lock
```

---

## 第二步：安装与配置 Cloudflare Tunnel 隧道

Cloudflare Tunnel（即 `cloudflared`）可以将本地运行在手机上的端口（如 8080 端口）穿透到公网，无需公网 IP 和路由端口映射。

### 2.1 下载适配手机架构的 cloudflared

Termux 一般运行在 ARM64 (aarch64) 架构上，下载官方二进制文件并放入 `$PREFIX/bin`：

```bash
# 查看手机架构（一般输出 aarch64）
uname -m

# 下载 ARM64 官方二进制
curl -L -o $PREFIX/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# 赋予执行权限
chmod +x $PREFIX/bin/cloudflared

# 验证是否安装成功
cloudflared --version
```
> **提示**：如果你的手机是 32 位老设备（输出 `armv7l`），请将链接替换为 `cloudflared-linux-arm`；如果是 PC 模拟器（`x86_64`），请替换为 `cloudflared-linux-amd64`。

---

## 第三步：启动隧道及常见错误解决（DNS/权限等）

在 Android / Termux 环境下直接运行 `cloudflared` 会遇到几个系统级特性限制，本节提供解决办法。

### 3.1 关键环境配置（必做，解决 DNS 拒绝报错）

**错误现象**：
```text
ERR Initiating shutdown error="Could not lookup srv records on _v2-origintunneld._tcp.argotunnel.com: 
lookup _v2-origintunneld._tcp.argotunnel.com on [::1]:53: read udp [::1]:58001->[::1]:53: read: connection refused"
```
**原因**：Android 系统没有 Linux 标准的 `/etc/resolv.conf`，Go 语言编写的程序会默认尝试连接本地回环 `127.0.0.1:53` 或 `[::1]:53`，导致连接被拒。

**解决方案**：
在 Termux 中写入公共 DNS 解析并导出环境变量：
```bash
# 创建并写入公共 DNS
mkdir -p $PREFIX/etc
cat << 'EOF' > $PREFIX/etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
nameserver 223.5.5.5
nameserver 114.114.114.114
EOF

# 导入 Go 网络解析与 CA 证书变量
export GODEBUG="netdns=go"
export RES_OPTIONS="nameserver 1.1.1.1"
export SSL_CERT_FILE="$PREFIX/etc/tls/cert.pem"
```

### 3.2 启动隧道方式

#### 方式 A：临时免配置快速隧道（自动分配随机域名）
适合临时测试、无需 Cloudflare 账号：
```bash
termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --dns 1.1.1.1 --url http://localhost:8080
```
启动后终端中会打印形如 `https://xxxx-xxxx.trycloudflare.com` 的公网网址，任何人和好友用此网址即可在公网打开手机里的游戏。

#### 方式 B：专用稳定固定域名隧道（推荐，使用 Tunnel Token）
如果你在 Cloudflare Zero Trust 控制台创建了 Named Tunnel，并拥有专属 Token：
```bash
# 将 your_token_here 替换为你在 Cloudflare 控制台复制的实际 Token
termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --dns 1.1.1.1 run --token your_token_here
```

### 3.3 其它常见错误排查
1. **`open /proc/sys/net/ipv4/ping_group_range: permission denied`**：
   - 这是 Android 系统安全限制（普通应用无权修改内核网络参数），该警告**不影响隧道正常工作**，可直接忽略。
2. **`termux-chroot: command not found`**：
   - 运行 `pkg install proot -y` 即可。`termux-chroot` 能提供标准的 Linux 虚拟路径环境，极大减少文件路径找不到的问题。

---

## 第四步：从 GitHub 拉取代码与安装项目依赖

### 4.1 拉取 GitHub 仓库代码
```bash
cd ~

# 克隆仓库到 ~/dd 目录
git clone https://github.com/wen775866/dd.git

# 进入项目目录
cd dd
```
如果之前已经克隆过，更新最新代码运行：
```bash
cd ~/dd
git checkout .
git pull
```

### 4.2 配置环境变量（可选，保存隧道 Token）
如果你有 Cloudflare 隧道 Token，可以存入根目录或项目根目录的 `.env`：
```bash
# 复制示例环境变量
cp .env.example .env

# 编辑 .env 文件填入你的 Token 与端口（可选）
nano .env
# 写入内容如：
# PORT=8080
# CLOUDFLARE_TUNNEL_TOKEN=你的Token
```

### 4.3 安装 npm 依赖
```bash
# 安装项目依赖（使用 --legacy-peer-deps 确保顺利安装）
npm install --legacy-peer-deps
```

---

## 第五步：编译与启动游戏服务

### 5.1 编译打包前端与服务端
```bash
# 构建前端 dist 静态文件以及 server.js 服务端入口
npm run build
```
编译成功后，目录中会生成 `dist/` 文件夹和 `server.js` 文件。

### 5.2 启动并验证游戏
```bash
# 启动游戏（默认端口 8080）
PORT=8080 npm start
```
此时终端会显示服务已在端口 8080 监听：
- **本机访问**：手机浏览器打开 `http://localhost:8080`
- **局域网访问**：同一 WiFi 下的朋友可打开 `http://<手机局域网IP>:8080`
- 按 `Ctrl + C` 可停止前台运行。

---

## 第六步：安装 PM2 进程守护与自动开机常驻

为了让游戏、Cloudflare 隧道以及 SSH 服务在手机锁屏、退到后台甚至断线后自动恢复与重启，使用 PM2 进行进程守护是最佳方案。

### 6.1 全局安装 PM2
```bash
npm install -g pm2
```

### 6.2 启动 SSHD 远程服务（可选但推荐）
Termux 自带 SSH 服务，方便电脑通过局域网连接手机排查问题：
```bash
# 设置 Termux 用户登录密码
passwd

# 启动 SSH 服务（默认端口 8022）
sshd
```

### 6.3 使用项目自带的 PM2 配置文件一键启动
项目已预置 `ecosystem.config.cjs`，它会自动守护 **游戏服务 (`ddz-game`)**、**SSH 服务 (`sshd`)** 和 **Cloudflare 隧道 (`cf-tunnel`)**：

```bash
cd ~/dd

# 使用 ecosystem.config.cjs 一键启动全部服务
pm2 start ecosystem.config.cjs

# 保存当前运行状态列表（开机恢复所用）
pm2 save
```

### 6.4 PM2 常用管理命令
```bash
# 查看所有后台服务状态 (ddz-game / sshd / cf-tunnel)
pm2 list

# 查看特定服务实时日志
pm2 logs ddz-game --lines 30
pm2 logs cf-tunnel --lines 30

# 重启全部服务
pm2 restart all

# 停止全部服务
pm2 stop all
```

### 6.5 设置 Termux 启动自动恢复（`.bashrc` 开机自启）
编辑 `~/.bashrc`，确保打开 Termux 时 PM2 服务自动处于活跃状态：
```bash
cat << 'EOF' >> ~/.bashrc

# Termux 启动自动恢复环境与 PM2 守护
export PREFIX="${PREFIX:-/data/data/com.termux/files/usr}"
export PATH="$PREFIX/bin:$HOME/bin:$PATH"
export GODEBUG="netdns=go"
export RES_OPTIONS="nameserver 1.1.1.1"

if command -v pm2 &> /dev/null; then
    pm2 resurrect > /dev/null 2>&1 || true
fi
EOF
```

至此，你在 Termux 上已经完整部署了游戏、隧道与进程守护，无论是本地游玩还是外网联机均可稳定长期运行！
