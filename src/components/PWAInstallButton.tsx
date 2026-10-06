import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share, PlusSquare, X, CheckCircle2, Globe, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { sounds } from '../utils/audio';

interface PWAInstallButtonProps {
  variant?: 'header' | 'button' | 'compact';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [browserType, setBrowserType] = useState<'edge' | 'chrome' | 'ios' | 'other'>('other');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setBrowserType('ios');
      } else if (/edg\//.test(ua) || /edga\//.test(ua) || /edge\//.test(ua)) {
        setBrowserType('edge');
      } else if (/chrome\//.test(ua)) {
        setBrowserType('chrome');
      }
    }
  }, []);

  // If already installed and running as standalone PWA, hide button
  if (isInstalled && !showGuide) {
    return null;
  }

  const handleInstallClick = async () => {
    sounds.playClick();
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
        return;
      }
    }
    // If browser didn't automatically pop up prompt or on Edge/Safari, show guided steps
    setShowGuide(true);
  };

  return (
    <>
      {/* Install Button Trigger */}
      <button
        onClick={handleInstallClick}
        className={`relative group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full font-black text-xs transition-all cursor-pointer shadow-lg active:scale-95 ${
          variant === 'compact'
            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
            : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white hover:brightness-110 shadow-cyan-500/30 border border-cyan-300/40'
        } ${className}`}
        title="安装手机 QQ 斗地主独立应用 (PWA)"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="whitespace-nowrap">安装 App</span>
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-300"></span>
        </span>
      </button>

      {/* Cross-Browser PWA Install Guide Modal */}
      {showGuide && (
        <div
          onClick={() => setShowGuide(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-cyan-500/50 p-5 shadow-2xl text-white relative flex flex-col gap-4"
          >
            {/* Close Button */}
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-400 flex items-center justify-center shadow-lg border border-cyan-300/40">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">安装到手机主屏幕</h3>
                <p className="text-xs text-cyan-300/80">
                  {browserType === 'edge'
                    ? 'Edge 浏览器安装指引'
                    : browserType === 'ios'
                    ? 'iOS Safari 安装指引'
                    : 'Chrome / 安卓安装指引'}
                </p>
              </div>
            </div>

            {/* Guide Steps based on browser */}
            <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800 flex flex-col gap-2.5 text-xs text-slate-300">
              {browserType === 'edge' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>
                      点击 Edge 底部中间的 <strong>菜单按钮 (···)</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>
                      向右滑动工具栏，点击 <strong>【添加到手机】</strong> 或 <strong>【作为应用安装】</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>
                      确认添加到桌面，即可生成独立桌面 App，自动以满屏横屏启动！
                    </p>
                  </div>
                </>
              ) : browserType === 'ios' ? (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      点击 Safari 底部或顶部的 <strong>分享</strong> 按钮 <Share className="w-3.5 h-3.5 text-cyan-400 inline" />
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      在菜单中向下滑动，点击 <strong>添加到主屏幕</strong> <PlusSquare className="w-3.5 h-3.5 text-cyan-400 inline" />
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>点击右上角 <strong>添加</strong>，桌面即可一键直接进入横屏游戏！</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">1</span>
                    <p>
                      点击浏览器右上角 <strong>菜单 (⋮)</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">2</span>
                    <p>
                      点击 <strong>【安装应用】</strong> 或 <strong>【添加到主屏幕】</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0">3</span>
                    <p>
                      点击安装后，桌面将生成独立应用图标，支持离线单机极速对战！
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Button */}
            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 text-white font-black text-xs cursor-pointer shadow-lg shadow-cyan-500/30 transition-all"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Installed Toast Notification */}
      {installSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-2xl border border-emerald-400 animate-in fade-in zoom-in-90">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>应用安装成功！已添加至桌面主屏幕</span>
        </div>
      )}
    </>
  );
};
