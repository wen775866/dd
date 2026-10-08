import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAppTheme } from '../utils/themeContext';
import { Maximize2, Minimize2 } from 'lucide-react';

interface LandscapeContextType {
  isLandscape: boolean;
  isRotated: boolean;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

export const LandscapeContext = createContext<LandscapeContextType>({
  isLandscape: true,
  isRotated: false,
  isFullscreen: false,
  toggleFullscreen: () => {},
});

export const useLandscape = () => useContext(LandscapeContext);

interface LandscapeWrapperProps {
  children: React.ReactNode;
}

export const LandscapeWrapper: React.FC<LandscapeWrapperProps> = ({ children }) => {
  const { theme, themeConfig } = useAppTheme();
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1000,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Toggle true HTML5 Fullscreen (Hides Android navigation bar / Home bar / Notch bar completely)
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if ((docEl as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        (docEl as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }

    // Try auto-locking screen orientation to landscape if supported by browser/PWA
    if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      try {
        (screen.orientation as unknown as { lock: (orientation: string) => Promise<void> })
          .lock('landscape')
          .catch(() => {});
      } catch (_) {}
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  // Is physical screen currently in portrait mode (height > width)?
  const isPortrait = dimensions.height > dimensions.width;

  // Geometry calculation:
  // - If portrait: rotate 90deg to present a full-screen landscape game.
  // - If already landscape (e.g. Chrome PWA fullscreen, landscape phone, PC): render directly at 0deg.
  const containerWidth = isPortrait ? dimensions.height : dimensions.width;
  const containerHeight = isPortrait ? dimensions.width : dimensions.height;
  const rotationTransform = isPortrait
    ? 'translate(-50%, -50%) rotate(90deg)'
    : 'translate(-50%, -50%) rotate(0deg)';

  const bgStyleColor = theme === 'deep-green' ? '#114732' : '#12476b';

  return (
    <LandscapeContext.Provider
      value={{
        isLandscape: true,
        isRotated: isPortrait,
        isFullscreen,
        toggleFullscreen,
      }}
    >
      <div 
        style={{ backgroundColor: bgStyleColor }}
        className="fixed inset-0 w-screen h-screen overflow-hidden select-none transition-colors duration-300"
      >
        {/* Responsive Landscape Canvas (90° on portrait, 0° on landscape) */}
        <div
          style={{
            width: `${containerWidth}px`,
            height: `${containerHeight}px`,
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: rotationTransform,
            transformOrigin: 'center center',
            overflow: 'hidden',
            backgroundColor: bgStyleColor,
            paddingTop: isPortrait ? 0 : 'env(safe-area-inset-top, 0px)',
            paddingBottom: isPortrait ? 0 : 'env(safe-area-inset-bottom, 0px)',
            paddingLeft: isPortrait ? 0 : 'env(safe-area-inset-left, 0px)',
            paddingRight: isPortrait ? 0 : 'env(safe-area-inset-right, 0px)',
          }}
          className={`${themeConfig.bgClass} flex flex-col justify-between relative shadow-2xl transition-colors duration-300`}
        >
          {/* Main Game Interface (Lobby / Tabletop) */}
          {children}

          {/* Floating Immersive Fullscreen Entry / Exit Toggle Button */}
          {!isFullscreen && (
            <button
              onClick={toggleFullscreen}
              className="absolute top-1 right-1 sm:top-2 sm:right-2 z-50 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-amber-300 hover:text-white border border-amber-400/40 shadow-lg backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 text-[10px] font-bold"
              title="进入沉浸式全屏 (隐藏底部按键与白色横条)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">全屏</span>
            </button>
          )}
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};

