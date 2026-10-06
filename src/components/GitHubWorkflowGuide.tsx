import React, { useState } from 'react';
import {
  GitBranch,
  Github,
  Terminal,
  Download,
  Copy,
  Check,
  Smartphone,
  CheckCircle2,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  FolderGit2,
  Sparkles
} from 'lucide-react';

interface GitHubWorkflowGuideProps {
  onDownloadZip: () => void;
}

export const GitHubWorkflowGuide: React.FC<GitHubWorkflowGuideProps> = ({ onDownloadZip }) => {
  const [username, setUsername] = useState<string>('wenxiu775866');
  const [repoName, setRepoName] = useState<string>('termux-doudizhu');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const cleanUser = username.trim() || 'your-username';
  const cleanRepo = repoName.trim() || 'termux-doudizhu';
  const gitUrl = `https://github.com/${cleanUser}/${cleanRepo}.git`;
  const rawUrl = `https://raw.githubusercontent/${cleanUser}/${cleanRepo}/main/install.sh`;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Hero Card */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 shadow-2xl overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold font-mono">
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>GitHub 源码托管 ➔ Termux Git 自动化部署方案</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              GitHub 仓库创建与 Termux 极速拉取部署全流程
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              将全部源码推送到您的专属 GitHub 仓库后，即可在任何 Android 手机的 Termux 终端中通过{' '}
              <code className="text-indigo-300 font-mono">git clone</code> 秒速部署并注册系统命令！
            </p>
          </div>

          <button
            onClick={onDownloadZip}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-900/40 transition-all cursor-pointer self-start lg:self-auto shrink-0 active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>下载 GitHub 规范源码包 (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* GitHub Repo Customizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">
              个性化配置您的 GitHub 仓库信息
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            修改下方用户名与仓库名，下方命令将自动实时联动更新
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              GitHub 用户名 / 组织名:
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="例如: wenxiu775866"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              仓库名称 (Repository Name):
            </label>
            <input
              type="text"
              value={repoName}
              onChange={e => setRepoName(e.target.value)}
              placeholder="例如: termux-doudizhu"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Live URL Display */}
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 truncate text-slate-300">
            <span className="text-slate-500">仓库地址:</span>
            <span className="text-emerald-400 font-bold truncate">{gitUrl}</span>
          </div>
          <a
            href={`https://github.com/${cleanUser}/${cleanRepo}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs shrink-0"
          >
            <span>访问仓库页面</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Two-Phase Deployment Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase 1: Upload to GitHub */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                PHASE 1
              </span>
              <span className="text-xs text-slate-400">电脑 / 网页端执行</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Github className="w-4 h-4 text-slate-300" />
              将项目推送到 GitHub
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1. 登录 GitHub 网页并点击右上角 <strong>New Repository</strong> 创建仓库名为{' '}
              <strong className="text-indigo-300">{cleanRepo}</strong>。<br />
              2. 点击页面顶部按钮下载源码包，解压后在项目目录执行以下命令：
            </p>

            <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-indigo-300 overflow-x-auto">
              <button
                onClick={() =>
                  copyText(
                    `# 初始化并推送到 GitHub 仓库:\ngit init\ngit add .\ngit commit -m "feat: 初版纯 Go 斗地主 Termux 部署版"\ngit branch -M main\ngit remote add origin ${gitUrl}\ngit push -u origin main`,
                    'git-push'
                  )
                }
                className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors shadow"
                title="复制推送命令"
              >
                {copiedKey === 'git-push' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre className="whitespace-pre">
{`git init
git add .
git commit -m "feat: 纯 Go 斗地主 Termux 原生版"
git branch -M main
git remote add origin ${gitUrl}
git push -u origin main`}
              </pre>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              已为您自动包含 <code className="text-slate-300">.github/workflows/ci.yml</code>，
              推送后 GitHub Actions 会自动进行跨平台编译验证！
            </span>
          </div>
        </div>

        {/* Phase 2: Pull and Deploy in Termux */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                PHASE 2
              </span>
              <span className="text-xs text-slate-400">Android 手机 Termux 执行</span>
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Termux 终端拉取与自动化部署
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              在 Android 手机上打开 Termux，直接复制并运行以下命令，完成克隆、原生编译并注册全局命令：
            </p>

            <div className="relative rounded-xl bg-slate-950 border border-slate-800 p-3.5 font-mono text-xs text-emerald-300 overflow-x-auto">
              <button
                onClick={() =>
                  copyText(
                    `# 手机 Termux 极速拉取与安装部署:\npkg update -y && pkg install -y git golang\ngit clone ${gitUrl}\ncd ${cleanRepo}\nchmod +x install.sh\n./install.sh`,
                    'termux-clone'
                  )
                }
                className="absolute right-2.5 top-2.5 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors shadow"
                title="复制 Termux 拉取命令"
              >
                {copiedKey === 'termux-clone' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <pre className="whitespace-pre">
{`# 1. 安装基础依赖
pkg update -y && pkg install -y git golang

# 2. 从 GitHub 拉取仓库
git clone ${gitUrl}
cd ${cleanRepo}

# 3. 执行自动化安装部署
chmod +x install.sh
./install.sh`}
              </pre>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>全局可用：</strong>脚本会自动将二进制写入 <code className="text-white">$PREFIX/bin/ddz</code>，
              安装后您随时在手机任何目录敲 <strong className="text-amber-300">ddz</strong> 即可直接开打！
            </span>
          </div>
        </div>
      </div>

      {/* Routine Update & Maintenance Commands */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
        <h4 className="font-bold text-sm sm:text-base text-slate-200 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          后续日常更新与版本迭代指南
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">在 Termux 中一键拉取最新代码并更新：</span>
              <button
                onClick={() =>
                  copyText(
                    `cd ~/${cleanRepo} && git pull && ./install.sh`,
                    'git-pull'
                  )
                }
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'git-pull' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>复制</span>
              </button>
            </div>
            <pre className="p-2 rounded bg-black/60 font-mono text-cyan-300 overflow-x-auto">
cd ~/{cleanRepo} && git pull && ./install.sh
            </pre>
            <p className="text-slate-400 text-[11px]">
              当你向 GitHub 提交了新版本后，在手机上运行该命令即可自动完成拉取并重新编译。
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">免 clone 一键极速安装 (Curl 方式)：</span>
              <button
                onClick={() =>
                  copyText(
                    `pkg install -y curl golang && curl -sSL ${rawUrl} | bash`,
                    'curl-install'
                  )
                }
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedKey === 'curl-install' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>复制</span>
              </button>
            </div>
            <pre className="p-2 rounded bg-black/60 font-mono text-amber-300 overflow-x-auto truncate">
curl -sSL {rawUrl} | bash
            </pre>
            <p className="text-slate-400 text-[11px]">
              适合给其他朋友分享，手机终端一行命令静默下载并自动安装！
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting Checklist */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>GitHub 克隆 Termux 常见问题排查与锦囊</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <strong className="text-slate-200 block mb-1">1. Git Clone 提示网络超时？</strong>
            在 Termux 中克隆 GitHub 如遇到网络波动，可使用国内镜像加速：
            <div className="font-mono text-[11px] text-emerald-400 mt-1 select-all">
              git clone https://gitclone.com/github.com/{cleanUser}/{cleanRepo}.git
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <strong className="text-slate-200 block mb-1">2. Termux 后台运行断开？</strong>
            可在 Termux 中输入 <code className="text-indigo-300">termux-wake-lock</code> 防止系统休眠杀死终端会话。
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <strong className="text-slate-200 block mb-1">3. 手机屏幕快捷按键未生效？</strong>
            执行 <code className="text-cyan-300">termux-reload-settings</code> 刷新即可显示 1-9 牌号虚拟按键。
          </div>
        </div>
      </div>
    </div>
  );
};
