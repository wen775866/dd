import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface LandscapeContextType {
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const LandscapeContext = createContext<LandscapeContextType>({
  toggleFullscreen: () => {},
  isFullscreen: false,
});

export const useLandscape = () => useContext(LandscapeContext);

interface LandscapeWrapperProps {
  children: React.ReactNode;
}

export const LandscapeWrapper: React.FC<LandscapeWrapperProps> = ({ children }) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });

  // Track window & visual viewport dimensions dynamically
  useEffect(() => {
    const updateDimensions = () => {
      if (typeof window !== 'undefined') {
        const w = window.visualViewport ? window.visualViewport.width : window.innerWidth;
        const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        setDimensions({
          width: Math.round(w),
          height: Math.round(h),
        });
        setIsFullscreen(!!document.fullscreenElement);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }
    document.addEventListener('fullscreenchange', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
      }
      document.removeEventListener('fullscreenchange', updateDimensions);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        if ('orientation' in screen && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, []);

  // Fixed 90-degree rotation geometry:
  // Container width equals physical screen height; Container height equals physical screen width.
  const containerWidth = dimensions.height;
  const containerHeight = dimensions.width;

  return (
    <LandscapeContext.Provider
      value={{
        toggleFullscreen,
        isFullscreen,
      }}
    >
      <div className="fixed inset-0 w-screen h-screen bg-[#050b14] overflow-hidden select-none">
        {/* Strictly Fixed 90-degree Rotated Global Landscape Canvas */}
        <div
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            transformOrigin: 'center center',
            overflow: 'hidden',
          }}
          className="bg-slate-950 flex flex-col justify-between relative shadow-2xl"
        >
          {/* Main Game Interface (Lobby / Tabletop) */}
          {children}

          {/* Minimal Top-Right Fullscreen Toggle */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-50">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-slate-300 hover:text-amber-300 border border-white/10 hover:border-amber-500/50 cursor-pointer shadow-lg active:scale-95 transition-all"
              title={isFullscreen ? '退出全屏' : '全屏体验'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};
