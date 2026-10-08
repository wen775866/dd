# 🌐 Serv00 免费虚拟主机 (FreeBSD) 部署完整教程

> Serv00 是一家老牌免费 FreeBSD 虚拟主机，提供免费的 SSH 终端访问和自定义端口运行环境。
> 本教程针对 Serv00 的 FreeBSD 系统特性、无 root 权限、端口分配限制以及后台进程保活机制提供专项部署方案。

---

## 目录
1. [Serv00 前置准备与端口申请](#一serv00-前置准备与端口申请)
2. [Node.js 与环境确认](#二nodejs-与环境确认)
3. [安装 cloudflared (FreeBSD 兼容方式)](#三安装-cloudflared-freebsd-兼容方式)
4. [从 GitHub 拉取代码与安装项目依赖](#四从-github-拉取代码与安装项目依赖)
5. [编译与启动游戏服务端](#五编译与启动游戏服务端)
6. [在 Serv00 上使用 PM2 守护与定时保活 (Cron)](#六在-serv00-上使用-pm2-守护与定时保活-cron)

---

## 一、Serv00 前置准备与端口申请

Serv00 是多用户共享的 FreeBSD 系统，所有端口需要通过 Web 控制台申请分配，且需要开启用户运行后台进程的权限。

### 1.1 开启允许后台进程运行权限（必做）
1. 登录 Serv00 控制面板：https://panel.serv00.com
2. 点击左侧导航栏的 **Additional services (其他服务)** -> **Run your own applications**。
3. 将状态切换为 **Enabled (启用)**。
> **注意**：如果不开启此项，Serv00 会定期清理用户在 SSH 后台启动的 Node 进程。

### 1.2 申请专用自定义端口 (Port Reservation)
1. 在 Serv00 面板左侧点击 **Port reservation (端口预约/申请)**。
2. 点击 **Add port**，类型选择 **TCP**。
3. 随机生成或自定义一个端口，例如记下分配给你的端口号：`32415`（每个人不同，以下以 `32415` 为例）。

---

## 二、Node.js 与环境确认

登录 Serv00 SSH 终端：
```bash
ssh username@sX.serv00.com
```

### 2.1 检查系统 Node.js 版本
Serv00 默认提供了多个版本的 Node.js：
```bash
node -v
npm -v
```
如果默认版本较低，可以在 `~/.cshrc` 或 `~/.bashrc` 中指定更高版本（Serv00 自带 Node 18 或 20，路径位于 `/usr/local/bin/node` 或通过模块加载）：
```bash
# 查看系统已安装的 node
which node
```

---

## 三、安装 cloudflared (FreeBSD 兼容方式)

Serv00 底层为 **FreeBSD x86_64** 系统，而非普通 Linux。

### 3.1 获取 FreeBSD 版本的 cloudflared
在用户根目录建立 `bin` 文件夹：
```bash
mkdir -p ~/bin
cd ~/bin

# 下载适配 FreeBSD 的 cloudflared 二进制
# 如果官方仓库无直接 release，可使用预编译版本或从 GitHub releases 下载 freebsd-amd64
curl -L -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-freebsd-amd64.tar.gz

# 解压并赋予权限
tar -xzf cloudflared-freebsd-amd64.tar.gz
chmod +x cloudflared
rm -f cloudflared-freebsd-amd64.tar.gz

# 将 ~/bin 加入 PATH
export PATH="$HOME/bin:$PATH"
cloudflared --version
```
> **提示**：如果遇到动态链接库问题，Serv00 也支持使用内置的 WWW 域名绑定本地端口（利用 Devil 命令行或面板的反向代理），此时甚至无需使用 cloudflared 即可直接公网访问。

### 3.2 启动隧道
```bash
# 临时隧道（将 32415 替换为您在 Serv00 申请的端口）：
cloudflared tunnel --url http://localhost:32415

# 或使用 Zero Trust Token：
cloudflared tunnel run --token <YOUR_TOKEN>
```

---

## 四、从 GitHub 拉取代码与安装项目依赖

```bash
cd ~
git clone https://github.com/wen775866/dd.git
cd dd

# 配置环境变量（填入在面板申请的端口）
cp .env.example .env
nano .env
# 设置：
# PORT=32415 (改成你面板申请的端口号)

# 安装依赖
npm install --legacy-peer-deps
```

---

## 五、编译与启动游戏服务端

```bash
# 构建静态前端与 server.js
npm run build

# 启动游戏（必须使用在面板申请的端口！）
PORT=32415 npm start
```
测试运行无报错后，按 `Ctrl + C` 退出，转入后台守护。

---

## 六、在 Serv00 上使用 PM2 守护与定时保活 (Cron)

因为 Serv00 没有 root 权限，且服务器偶尔会重启，建议使用 npm 局部或全局安装 PM2，并配合 Serv00 的 Crontab 计划任务实现崩溃自启与断线重连。

### 6.1 安装 PM2
```bash
npm install -g pm2
# 或者在项目内使用 npx pm2
```
若遇到权限问题，可配置 npm 全局路径到用户目录：
```bash
mkdir -p ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g pm2
```

### 6.2 启动项目
```bash
cd ~/dd
pm2 start server.js --name "ddz-serv00" --env PORT=32415

# 如果同时运行隧道
# pm2 start cloudflared --name "cf-tunnel" -- tunnel --url http://localhost:32415

# 保存任务列表
pm2 save
```

### 6.3 使用 Serv00 Crontab 实现每小时自动保活
Serv00 偶尔会清理或维护节点，我们可以利用系统自带的 Cron 每 10 分钟检测一次并恢复：
```bash
crontab -e
```
在打开的编辑器中添加一行：
```cron
*/10 * * * * ~/.npm-global/bin/pm2 resurrect > /dev/null 2>&1
```
保存并退出即可。

### 6.4 日常代码拉取与更新（保证编译最新代码）
```bash
cd ~/dd

# 1. 撤销可能产生的本地变动并拉取远程更新
git checkout .
git pull

# 2. 安装可能新增的依赖
npm install --legacy-peer-deps

# 3. 彻底清理旧编译产物并重新生成最新代码
npm run clean && npm run build

# 4. 重载 PM2 进程
pm2 restart ddz-serv00
```

### 6.5 也可以直接绑定 Serv00 自带二级域名（免隧道公网访问）
在 Serv00 面板的 **WWW Websites** 中添加网站，域名选 `yourusername.serv00.net`，网站类型选择 **Proxy**，代理目标填写 `http://127.0.0.1:32415`。这样全世界无需开启 Cloudflare Tunnel，也可以直接访问你的游戏！
