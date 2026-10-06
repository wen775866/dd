# 🃏 手机 QQ 斗地主 (Web 横屏版) · Termux 部署指南

> 本项目为高度还原经典手机 QQ 斗地主的 Web 网页版，采用 **全局固定旋转 90 度横屏** 架构。手机竖屏打开即自动呈现沉浸式横屏视界，适配局域网 WiFi 联机与 Cloudflare Tunnel 公网隧道穿透。
>
> 🔗 **GitHub 仓库地址**：[https://github.com/wen775866/dd.git](https://github.com/wen775866/dd.git)

---

## 📱 核心功能特性

- 🎮 **经典 QQ 斗地主游戏大厅**：初级场、中级场、高级场、至尊场与不洗牌连炸场，金币与欢乐豆成长体系。
- 🔄 **全局固定 90° 旋转横屏**：无需开启手机系统自动旋转，打开网页即刻铺满屏幕，零黑边、零滚动条。
- 🃏 **SVG 矢量高清扑克牌**：全套 54 张卡牌高清矢量渲染，支持理牌（按大小/按牌型）与多选牌重选。
- 🤖 **进阶 AI 算法与同盟协作**：智能叫地主/抢地主/加倍评估模型，农民上下家配合作战与防地主策略。
- ⚡ **智能多方案轮换提示**：连续点击“提示”智能循环推荐所有可压制上家的候选出牌方案。
- 🤖 **一键智能托管模式**：临时离开可一触开启 AI 代打，随时点击解除托管收回控制权。
- 💬 **经典快捷短语与互动表情**：“*快点吧，我等的花儿都谢了！*”、“*和你合作真是太愉快了！*”及炸弹、鲜花、咖啡互动。
- 💥 **酷炫牌型全屏特效**：王炸火箭升空、炸弹连击震屏、飞机呼啸横穿、顺子连对流光、春天与反春天双倍结算。
- 🏆 **对局终盘明牌复盘**：结算面板公开展示三家剩余所有手牌，胜负走势清晰透明。

---

## 🚀 Termux 手机一键极速部署教程

无论你在自己的安卓手机上玩，还是作为局域网主机分享给朋友，仅需以下几步即可在 Termux 中完整跑起来！

### 第一步：准备 Termux 运行环境

打开手机上的 **Termux** 应用，执行以下命令更新软件包并安装 `git` 和 `nodejs`：

```bash
# 1. 更新软件包仓库并安装 Node.js 与 Git
pkg update -y && pkg install -y git nodejs
```

> **国内加速提示（可选）**：如果下载依赖较慢，可切换 npm 镜像源：
> ```bash
> npm config set registry https://registry.npmmirror.com
> ```

---

### 第二步：从 GitHub 拉取代码仓库

```bash
# 克隆仓库到 Termux 本地目录
git clone https://github.com/wen775866/dd.git

# 进入项目目录
cd dd
```

---

### 第三步：安装依赖并构建生产版本

```bash
# 安装项目依赖
npm install

# 编译打包前端静态工程（极速编译并优化体积）
npm run build
```

---

### 第四步：启动网页游戏服务

```bash
# 以生产预览模式启动（绑定 0.0.0.0，开放局域网访问，监听 3000 端口）
npm run preview
```

终端会输出：
```text
  ➜  Local:   http://localhost:3000/
  ➜  Network: http://192.168.x.x:3000/
```

此时，在手机自带浏览器中输入 **`http://localhost:3000`** 即可立即畅玩！

---

## 🌐 局域网 WiFi 联机对战访问

想让同处于一个 WiFi（局域网）下的其他手机、平板或电脑也能打开游玩？

1. 在 Termux 中新开一个会话或按下 `Ctrl + C` 前查看当前手机的局域网 IP：
   ```bash
   # 查看局域网 IP 地址
   ifconfig | grep inet
   ```
   *通常形如 `192.168.1.105` 或 `192.168.0.x`*

2. 在同一 WiFi 下的任何设备（如苹果手机、朋友的安卓手机、电脑浏览器）上输入：
   ```text
   http://你的手机IP:3000
   例如：http://192.168.1.105:3000
   ```
   打开就是横屏手机 QQ 斗地主游戏大厅！

---

## ☁️ Cloudflare Tunnel 公网免端口穿透（打开域名就是游戏）

如果你想在 **外网任何地方（流量环境、异地好友）** 打开一个网址/域名就能直接玩，推荐使用 **Cloudflare Tunnel**（免费且无需公网 IP 与路由器端口映射）：

### 1. 在 Termux 中安装 Cloudflared

```bash
pkg install -y cloudflared
```

### 2. 启动临时快速隧道（免登录一键获取全球域名）

确保后台已经运行了 `npm run preview`（端口 3000），然后执行：

```bash
cloudflared tunnel --url http://localhost:3000
```

终端中会出现类似下方的一行链接：
```text
+--------------------------------------------------------------------------------------------+
|  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
|  https://random-words-here.trycloudflare.com                                               |
+--------------------------------------------------------------------------------------------+
```

将该 **`https://xxxxxx.trycloudflare.com`** 发给任何人，在任何手机浏览器中打开就是原汁原味的手机 QQ 斗地主游戏！

### 3. 绑定自己购买的顶级域名（可选）

如果你在 Cloudflare 上有自定义域名（如 `ddz.yourdomain.com`）：
```bash
# 登录 Cloudflare 账号授权
cloudflared tunnel login

# 创建命名隧道
cloudflared tunnel create ddz-tunnel

# 配置路由指向本机的 3000 端口并启动
cloudflared tunnel route dns ddz-tunnel ddz.yourdomain.com
cloudflared tunnel run --url http://localhost:3000 ddz-tunnel
```

---

## 🔋 Termux 后台持续运行（锁屏不掉线）

为了防止手机息屏或退出 Termux 后进程被系统杀掉：

### 1. 获取 Termux 唤醒锁（防止息屏休眠）
在 Termux 中执行：
```bash
termux-wake-lock
```
*(通知栏将显示 `Termux: wake lock acquired`)*

### 2. 使用 PM2 守护进程管理游戏后台运行（强烈推荐）
```bash
# 全局安装进程守护工具 pm2
npm install -g pm2

# 后台守护启动斗地主服务
pm2 start "npm run preview" --name ddz

# 查看运行状态
pm2 status

# 开机/启动保存
pm2 save
```

后续常用命令：
- 停止服务：`pm2 stop ddz`
- 重启服务：`pm2 restart ddz`
- 查看实时日志：`pm2 logs ddz`

---

## 🛠️ 常用维护命令与更新

若仓库有新版本发布，可以在 Termux 的 `dd` 目录下拉取更新：

```bash
cd ~/dd
git pull
npm install
npm run build
pm2 restart ddz  # 如果使用了 pm2
```

---

## ❓ 常见问题排查 (FAQ)

1. **问：打开网页后是一片空白？**
   - 答：请检查是否执行了 `npm run build`。推荐使用 `npm run preview`，或者使用 `npm run dev` 开发模式运行。

2. **问：端口 3000 被占用报错 `EADDRINUSE: address already in use`？**
   - 答：通过命令找出并关闭旧进程：
     ```bash
     fuser -k 3000/tcp
     # 或
     kill $(lsof -t -i:3000)
     ```

3. **问：可以在 PC 电脑浏览器打开吗？**
   - 答：可以，由于采用了专为手机打造的全局 90° 旋转横屏模式，在手机竖屏体验极佳；电脑端也可直接点右上角全屏沉浸体验。

---

*祝您开局一把连炸，天天当雀圣！* 🎴✨
