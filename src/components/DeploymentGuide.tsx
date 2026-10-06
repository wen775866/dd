import React, { useState } from 'react';
import { Smartphone, Check, Copy, ExternalLink, Terminal, ShieldAlert, Cpu, Zap, Sparkles, FolderDown, ArrowRight } from 'lucide-react';
import { GO_SINGLE_FILE } from '../data/goSourceCode';

export const DeploymentGuide: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const steps = [
    {
      num: '01',
      title: '在 Android 手机上安装 Termux',
      badge: '避坑指南',
      content: (
        <div className="space-y-3">
          <p className="text-slate-300 text-sm leading-relaxed">
            <strong className="text-amber-400">特别提醒：</strong>
            切勿从 Google Play 商店安装 Termux（已停更且无法更新包）。请务必从{' '}
            <strong className="text-emerald-400">F-Droid</strong> 或{' '}
            <strong className="text-cyan-400">GitHub Release</strong> 下载最新官方构建包。
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <a
              href="https://f-droid.org/packages/com.termux/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              F-Droid 官方下载
            </a>
            <a
              href="https://github.com/termux/termux-app/releases"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              GitHub Releases 下载 (APK)
            </a>
          </div>
        </div>
      ),
    },
    {
      num: '02',
      title: '初始化 Termux 并安装 Golang 环境',
      badge: '一键命令',
      command: `pkg update -y && pkg install -y golang git`,
      desc: '在手机上启动 Termux 后，执行该命令自动配置 aarch64 (ARM64) 架构的原生 Go 编译器与运行时。若下载缓慢，可先输入 termux-change-repo 切换国内镜像源（如清华源）。',
    },
    {
      num: '03',
      title: '部署 Go 斗地主源码 (单文件极简部署)',
      badge: '核心步骤',
      command: `mkdir -p ~/ddz && cd ~/ddz
cat << 'EOF' > main.go
${GO_SINGLE_FILE}
EOF`,
      desc: '将完整的纯 Go 斗地主代码一键写入到 Termux 本地 ~/ddz/main.go 文件中。无任何第三方网络依赖，使用标准库即可直接运行！',
    },
    {
      num: '04',
      title: '本地编译并启动游戏',
      badge: '运行',
      command: `go build -ldflags "-s -w" -o doudizhu main.go
./doudizhu`,
      desc: '使用 -ldflags "-s -w" 参数裁剪调试符号，生成极致小巧高效的 ARM 架构二进制文件。之后每次只要输入 ./doudizhu 即可畅快开局！',
    },
    {
      num: '05',
      title: '手机屏幕虚拟快捷按键增强 (极佳手感)',
      badge: 'Termux 专属优化',
      command: `mkdir -p ~/.termux
cat << 'EOF' > ~/.termux/termux.properties
extra-keys = [ \\
  ['ESC', '1', '2', '3', '4', '5', '6', '7'], \\
  ['TAB', '8', '9', '0', 'p', 'q', 'ENTER', 'BACKSPACE'] \\
]
EOF
termux-reload-settings`,
      desc: 'Termux 默认软键盘没有数字行和出牌快捷键。配置此项后，Termux 屏幕上方会直接出现专属的 1-9 选牌键、p (不出)、q (退出) 与 ENTER 键，无需频繁切换手机输入法！',
    },
    {
      num: '06',
      title: '设置全局命令别名 (alias ddz)',
      badge: '便捷体验',
      command: `echo "alias ddz='$HOME/ddz/doudizhu'" >> ~/.bashrc
source ~/.bashrc`,
      desc: '配置之后，无论你在 Termux 的哪个目录下，直接敲入 ddz 即可随时随地开启一局斗地主！',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-[radial-gradient(ellipse_at_top_right,rgba(16,185,129,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Android ARM64 · Termux Native Go Deployment</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Go 语言斗地主 · Android Termux 极速部署指南
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              只需 3 分钟，即可将轻量高效的 Go 终端版斗地主完整部署到 Android 手机上，无需 Root 权限，
              断网随时随地对战高智商 AI！
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-emerald-400 font-mono font-bold text-sm">~6 MB</div>
              <div className="text-[10px] text-slate-400">二进制体积</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-cyan-400 font-mono font-bold text-sm">0 Dep</div>
              <div className="text-[10px] text-slate-400">纯标准库</div>
            </div>
            <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
              <div className="text-amber-400 font-mono font-bold text-sm">Offline</div>
              <div className="text-[10px] text-slate-400">单机免流</div>
            </div>
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-md transition-all flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black font-mono text-sm flex items-center justify-center">
                  {step.num}
                </span>
                <h3 className="font-bold text-base text-slate-100">{step.title}</h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {step.badge}
              </span>
            </div>

            {step.desc && (
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed pl-11">
                {step.desc}
              </p>
            )}

            {step.content && <div className="pl-11">{step.content}</div>}

            {step.command && (
              <div className="pl-11">
                <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <button
                    onClick={() => copyToClipboard(step.command!, `step-${idx}`)}
                    className="absolute right-2 top-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow"
                    title="复制命令"
                  >
                    {copiedId === `step-${idx}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <pre className="whitespace-pre pr-8">{step.command}</pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Advanced Topic: PC Cross-compiling for Android */}
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-slate-100 text-sm sm:text-base">
            进阶技巧：从电脑直接交叉编译推送到手机 (Cross-Compilation)
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          如果你不想在手机 Termux 上执行编译，可以在 Windows / macOS / Linux 电脑上直接使用 Go 强大的跨平台交叉编译：
        </p>
        <div className="relative rounded-lg bg-slate-950 border border-slate-800 p-3 font-mono text-xs text-indigo-300 overflow-x-auto">
          <button
            onClick={() =>
              copyToClipboard(
                `# 在电脑终端中编译出针对 Android ARM64 的二进制程序:\nCGO_ENABLED=0 GOOS=android GOARCH=arm64 go build -ldflags "-s -w" -o doudizhu main.go\n\n# 通过 ADB 发送到手机 Termux 目录:\nadb push doudizhu /data/local/tmp/\n# 或者通过手机微信/QQ/网盘发送，放到 Termux 目录后 chmod +x doudizhu 即可直接执行！`,
                'cross-compile'
              )
            }
            className="absolute right-2 top-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="复制"
          >
            {copiedId === 'cross-compile' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
          <pre className="whitespace-pre">
{`# 在电脑终端中编译出针对 Android ARM64 的二进制程序:
CGO_ENABLED=0 GOOS=android GOARCH=arm64 go build -ldflags "-s -w" -o doudizhu main.go

# 通过 ADB 或局域网传输到手机:
adb push doudizhu /data/local/tmp/
# 赋予执行权限并启动:
chmod +x doudizhu && ./doudizhu`}
          </pre>
        </div>
      </div>

      {/* Common FAQ */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          常见问答与排错指南 (FAQ)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-200 font-semibold block mb-1">Q: 执行 pkg install 提示网络连接失败？</span>
            A: 这是因为官方默认镜像源在海外。在 Termux 输入 <code className="text-emerald-300">termux-change-repo</code>，选择 Mirrors by Tsinghua (清华镜像) 或 BFSU，再按确定即可秒速更新。
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-200 font-semibold block mb-1">Q: 扑克牌花色字符 (♠ ♥ ♣ ♦) 显示为方框乱码？</span>
            A: 现代 Android 系统字体均自带标准 UTF-8 扑克符号。如果乱码，可通过安装 Termux:Styling 插件更换为带有完整 Nerd Font 符号的等宽字体（如 FiraCode 或 Hack）。
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-200 font-semibold block mb-1">Q: 如何设置桌面桌面快捷方式 (桌面图标)？</span>
            A: 可以在 F-Droid 安装 <code className="text-cyan-300">Termux:Widget</code>，在 <code className="text-slate-300">~/.shortcuts/</code> 下建立一个执行脚本 <code className="text-slate-300">ddz.sh</code>，即可在手机桌面添加一键启动小部件！
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-200 font-semibold block mb-1">Q: 可以在后台挂机或多人 WiFi 联机吗？</span>
            A: 可以！我们源码中附带了 <code className="text-indigo-300">lan_server.go</code>，在同一 WiFi 下启动后，3 台手机通过终端 <code className="text-slate-300">nc 主机IP 8888</code> 即可直接局域网联机！
          </div>
        </div>
      </div>
    </div>
  );
};
