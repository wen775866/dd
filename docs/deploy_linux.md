# 🐧 Linux (Ubuntu / Debian / CentOS / Alpine) 部署完整教程

> 本教程适用于各类标准 Linux 云服务器（如阿里云、腾讯云、华为云、AWS、甲骨文云、DigitalOcean）或个人家用软路由 / 本地 Linux 主机。

---

## 目录
1. [系统环境准备与依赖安装](#一系统环境准备与依赖安装)
2. [安装与配置 Cloudflare Tunnel 隧道](#二安装与配置-cloudflare-tunnel-隧道)
3. [从 GitHub 拉取代码与安装依赖](#三从-github-拉取代码与安装依赖)
4. [编译与启动游戏服务](#四编译与启动游戏服务)
5. [配置 PM2 进程守护与开机自启](#五配置-pm2-进程守护与开机自启)
6. [Nginx 反向代理配置（可选）](#六nginx-反向代理配置可选)

---

## 一、系统环境准备与依赖安装

### 1.1 系统更新与基础工具
#### Ubuntu / Debian 系：
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

#### CentOS / Rocky Linux / RHEL 系：
```bash
sudo dnf update -y
sudo dnf install -y curl wget git gcc-c++ make
```

### 1.2 安装 Node.js (推荐 Node.js v18 或 v20 LTS)
使用 NodeSource 官方源快速安装：
```bash
# Ubuntu / Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 检查安装版本 (Node.js >= 18, npm >= 9)
node -v
npm -v
```

---

## 二、安装与配置 Cloudflare Tunnel 隧道

在 Linux 服务器上，Cloudflare Tunnel 可以直接作为 systemd 守护进程运行，无需公网开放防火墙入站端口。

### 2.1 安装 cloudflared 官方客户端
#### 方式 A：通过包管理器一键安装（推荐）
```bash
# 添加 Cloudflare 官方 GPG 密钥并安装 (Ubuntu/Debian)
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared jammy main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared

# 验证安装
cloudflared --version
```

#### 方式 B：直接下载 Linux 二进制文件
```bash
# x86_64 架构
sudo curl -L -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo chmod +x /usr/local/bin/cloudflared

# ARM64 架构（例如树莓派或 ARM 机器）
# sudo curl -L -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64
# sudo chmod +x /usr/local/bin/cloudflared
```

### 2.2 启动隧道与绑定服务
#### 方式 1：使用 Cloudflare Zero Trust Named Tunnel Token（生产推荐）
在 Cloudflare Zero Trust 后台创建 Tunnel 后，获得一串长 Token：
```bash
# 前台测试运行
cloudflared tunnel --protocol http2 run --token <YOUR_CLOUDFLARE_TUNNEL_TOKEN>

# 或者直接注册为 Linux 系统 systemd 服务开机自启
sudo cloudflared service install <YOUR_CLOUDFLARE_TUNNEL_TOKEN>
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

#### 方式 2：使用临时试用隧道（快速体验）
```bash
cloudflared tunnel --url http://localhost:8080
```
控制台会输出临时分配的 `https://xxx.trycloudflare.com` 链接。

---

## 三、从 GitHub 拉取代码与安装依赖

```bash
# 建议克隆到 /var/www 或用户根目录
cd ~
git clone https://github.com/wen775866/dd.git
cd dd

# 复制环境变量配置
cp .env.example .env

# 编辑配置（如修改端口 PORT=8080 或填入 CLOUDFLARE_TUNNEL_TOKEN）
nano .env

# 安装 npm 项目依赖
npm install --legacy-peer-deps
```

---

## 四、编译与启动游戏服务

```bash
# 编译前端静态页面及后端 server.js
npm run build

# 测试启动游戏
PORT=8080 npm start
```
此时通过浏览器访问服务器的公网 IP 或域名：`http://<服务器IP>:8080` 即可正常游戏。按 `Ctrl + C` 退出。

---

## 五、配置 PM2 进程守护与开机自启

### 5.1 安装 PM2
```bash
sudo npm install -g pm2
```

### 5.2 启动项目（仅托管纯粹游戏服务）
进入项目根目录：
```bash
cd ~/dd

# 使用 PM2 纯净托管游戏（不启动任何额外隧道或 SSHD）
pm2 start server.js --name "ddz-game" --env PORT=8080
```
> **注意**：`ecosystem.config.cjs` 是专为 Android Termux 手机环境打造的一键组合配置（包含了 Termux 特有的 DNS 修正与前台 SSH 守护）。在标准 Linux 服务器上，**直接托管 `server.js` 即可**，避免引入多余进程。

### 5.3 保存状态与配置开机自启
```bash
# 保存当前 PM2 任务列表
pm2 save

# 生成并激活 Linux 开机自启服务命令（根据终端提示复制执行 sudo env PATH...）
pm2 startup
```

### 5.4 运维常用命令
```bash
# 查看所有任务状态
pm2 list

# 查看实时日志
pm2 logs ddz-game

# 重启或停止服务
pm2 restart all
pm2 stop all
```

---

## 六、Nginx 反向代理配置（可选）

如果你有自己的独立域名且不使用 Cloudflare Tunnel，可通过 Nginx 进行反向代理并开启 HTTPS：

```nginx
server {
    listen 80;
    server_name ddz.yourdomain.com;

    # 强制跳转 HTTPS（如已申请 SSL）
    # return 301 https://$host$request_uri;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        
        # 支持 WebSocket 长连接（游戏实时对战必须）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
运行 `sudo nginx -t && sudo systemctl reload nginx` 使其生效。
