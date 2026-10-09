import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAppTheme } from '../utils/themeContext';

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
          width: Math.max(300, Math.round(w)),
          height: Math.max(300, Math.round(h)),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
    }

    // Auto-locking screen orientation to landscape if supported by browser/PWA
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

  // Is screen in portrait mode (height > width)?
  const isPortrait = dimensions.height > dimensions.width;

  // Fixed 90-degree rotation when in portrait mode
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
        {/* Responsive Landscape Canvas (90° fixed rotation on portrait, 0° on landscape) */}
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
          {children}
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};
