import React, { useState } from 'react';
import { GITHUB_REPO_FILES, SourceFile } from '../data/goSourceCode';
import { Download, Copy, Check, FileCode, Terminal, Layers, Code, BookOpen, Sparkles } from 'lucide-react';
import JSZip from 'jszip';

interface SourceCodeViewerProps {
  onDownloadZip: () => void;
}

export const SourceCodeViewer: React.FC<SourceCodeViewerProps> = ({ onDownloadZip }) => {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const currentFile = GITHUB_REPO_FILES[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingleFile = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = currentFile.content.split('\n');

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" />
            Go 语言源码工程库 · 模块架构
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            原生 Go 标准库构建，零 CGO 编译依赖，可在 x86/ARM/ARM64 任何架构终端直接编译运行。
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadZip}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>下载全部源码 (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Code Browser Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* File Tree Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-2">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-md">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
              项目文件结构
            </span>
            <div className="space-y-1">
              {GITHUB_REPO_FILES.map((file, idx) => (
                <button
                  key={file.name}
                  onClick={() => setActiveFileIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    activeFileIndex === idx
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 ${activeFileIndex === idx ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-sans text-slate-500 px-1.5 py-0.5 rounded bg-slate-950">
                    {file.language}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Architecture Explanations Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-200">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Go 代码核心设计亮点</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong className="text-slate-300">ANSI 终端流渲染：</strong>
                采用 <code className="text-indigo-300">\033[H\033[2J</code> 消除屏幕闪烁，兼容手机窄屏排版。
              </li>
              <li>
                <strong className="text-slate-300">牌型分析引擎：</strong>
                利用 <code className="text-indigo-300">map[int]int</code> 进行点数聚合，单次遍历解析顺子、连对与飞机。
              </li>
              <li>
                <strong className="text-slate-300">智能 AI 启发式：</strong>
                具备农民同盟保护机制，避免炸弹误炸队友，压制地主高牌。
              </li>
            </ul>
          </div>
        </div>

        {/* Code Content Viewer */}
        <div className="lg:col-span-8 flex flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
          {/* Top Code Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-100">{currentFile.path}</span>
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                ({currentFile.description})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                title="复制代码到剪贴板"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
              <button
                onClick={handleDownloadSingleFile}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-medium cursor-pointer transition-colors"
                title="保存该文件"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">保存</span>
              </button>
            </div>
          </div>

          {/* Line Numbers + Code Content */}
          <div className="p-4 overflow-x-auto h-[500px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed flex">
            <div className="select-none pr-4 text-slate-600 text-right font-mono border-r border-slate-800/80 min-w-[36px]">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="pl-4 whitespace-pre font-mono text-emerald-300/95 flex-1">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
