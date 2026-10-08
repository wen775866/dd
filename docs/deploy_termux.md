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
termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 --url http://localhost:8080
```
启动后终端中会打印形如 `https://xxxx-xxxx.trycloudflare.com` 的公网网址，任何人和好友用此网址即可在公网打开手机里的游戏。

#### 方式 B：专用稳定固定域名隧道（推荐，使用 Tunnel Token）
如果你在 Cloudflare Zero Trust 控制台创建了 Named Tunnel，并拥有专属 Token：
```bash
# 将 your_token_here 替换为你在 Cloudflare 控制台复制的实际 Token
termux-chroot cloudflared tunnel --edge-ip-version 4 --protocol http2 run --token your_token_here
```

### 3.3 其它常见错误排查
1. **`open /proc/sys/net/ipv4/ping_group_range: permission denied`**：
   - 这是 Android 系统安全限制（普通应用无权修改内核网络参数），该警告**不影响隧道正常工作**，可直接忽略。
2. **`termux-chroot: command not found`**：
   - 运行 `pkg install proot -y` 即可。`termux-chroot` 能提供标准的 Linux 虚拟路径环境，极大减少文件路径找不到的问题。

---

## 第四步：从 GitHub 拉取代码与配置分离存储（核心重点）

> 💡 **核心设计原则（配置与代码完全隔离）**：
> - **Termux 根目录 `~`**（上级目录）：放置你的个人私密配置 `~/.env` 和 PM2 配置文件 `~/ecosystem.config.cjs`。
> - **游戏代码目录 `~/dd`**（子目录）：只存放 GitHub 游戏源代码与编译文件。
> - **巨大优势**：后续无论你在 `~/dd` 里如何运行 `git checkout .`、`git pull` 甚至强制重置代码，都**绝对不会覆盖或丢失你的个人配置与 Token**！

### 4.1 拉取 GitHub 仓库代码
```bash
cd ~

# 克隆仓库到 ~/dd 目录
git clone https://github.com/wen775866/dd.git

# 进入项目目录
cd dd
```

### 4.2 将配置文件初始化到上级目录（Termux 根目录 `~`）
执行以下命令，将配置模板复制到上级根目录中永久保留：
```bash
# 复制环境变量模板到上级根目录 ~/.env
cp ~/dd/.env.example ~/.env

# 复制 PM2 生态配置模板到上级根目录 ~/ecosystem.config.cjs
cp ~/dd/ecosystem.config.cjs ~/ecosystem.config.cjs
```

### 4.3 编辑根目录配置文件 `~/.env`
```bash
nano ~/.env
```
根据你的需求修改以下参数（按 `Ctrl + O` 回车保存，`Ctrl + X` 退出）：
```ini
# 游戏服务运行端口（默认 8080）
PORT=8080

# Cloudflare Tunnel 专属 Token（若没有可留空，将自动使用临时隧道）
CLOUDFLARE_TUNNEL_TOKEN=你的Cloudflare_Token

# 是否托管手机 SSH 服务（默认 false，如需 PM2 一同守护手机 SSH 服务可改为 true）
ENABLE_SSHD=false
```

### 4.4 安装 npm 项目依赖
```bash
cd ~/dd

# 使用 --legacy-peer-deps 确保顺利安装全部依赖
npm install --legacy-peer-deps
```

---

## 第五步：编译与启动验证游戏服务

### 5.1 编译打包前端与服务端
```bash
cd ~/dd

# 强制清理旧缓存并构建最新代码（生成 dist/ 静态文件和 server.js 入口）
npm run clean && npm run build
```
编译成功后，终端会打印出模块打包成功提示，并在 `~/dd` 目录下生成 `dist/` 与 `server.js`。

### 5.2 启动并验证游戏
```bash
cd ~/dd

# 前台临时启动测试
npm start
```
此时终端会显示服务已启动：
- **手机本机测试**：打开手机浏览器访问 `http://localhost:8080`，确认能进入斗地主大厅。
- 确认无误后，在终端按键盘 **`Ctrl + C`** 停止前台测试。

---

## 第六步：安装 PM2 进程守护与自动常驻管理

为了让游戏和 Cloudflare 隧道在手机退到后台、锁屏甚至网络切换后自动维持常驻，使用 PM2 守护。

### 6.1 全局安装 PM2
```bash
npm install -g pm2
```

### 6.2 在 Termux 根目录一键启动全部后台守护
因为我们前面把配置文件放到了上级根目录，所以直接在 `~` 启动即可：
```bash
cd ~

# 使用根目录的 ecosystem.config.cjs 启动
pm2 start ecosystem.config.cjs

# 保存当前运行列表状态（手机重启或唤醒后自动恢复）
pm2 save
```

`ecosystem.config.cjs` 已经内置了全自动路径识别与环境检测机制：
1. 它会自动定位到 `~/dd` 目录中的 `server.js` 执行游戏守护。
2. 自动载入 `~/.env` 中的 `PORT` 和 `CLOUDFLARE_TUNNEL_TOKEN`。
3. 在 Termux 环境下自动通过 `termux-chroot` 和公共 DNS 运行 `cloudflared`，彻底解决 Go 语言在安卓下的 DNS 解析被拒报错。

### 6.3 检查运行状态与公网网址
```bash
# 查看所有进程运行状态（ddz-game 和 cf-tunnel 应为 online）
pm2 status

# 查看 Cloudflare 隧道的实时日志与分配的公网访问网址
pm2 logs cf-tunnel --lines 20 --nostream
```
如果使用的是临时隧道，日志中会显示 `https://xxxx.trycloudflare.com`，发送给好友即可开始对战！

### 6.4 PM2 常用管理命令
```bash
# 重启全部服务
pm2 restart all

# 重启游戏服务
pm2 restart ddz-game

# 重启隧道服务
pm2 restart cf-tunnel

# 停止全部服务
pm2 stop all
```

---

## 第七步：后续日常拉取 GitHub 更新流程（安全无忧）

当 GitHub 仓库有新功能或 Bug 修复发布时，由于你的 `.env` 和 `ecosystem.config.cjs` 保存在上级根目录 `~`，你可以在 `~/dd` 放心大胆地拉取更新，完全不用担心配置文件被覆盖：

```bash
cd ~/dd

# 1. 撤销本地代码变动并拉取最新版本（配置文件在外面，百分之百安全）
git checkout .
git pull

# 2. 安装可能新增的依赖
npm install --legacy-peer-deps

# 3. 强制清理旧缓存并重新编译最新前端与后端
npm run clean && npm run build

# 4. 重启 PM2 进程生效最新游戏
pm2 restart all
```

---

## 第八步：设置 Termux 启动自动恢复（`.bashrc` 开机自启）
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
