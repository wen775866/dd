import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useAppTheme } from '../utils/themeContext';
import { Maximize2, Minimize2, Move } from 'lucide-react';

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

/**
 * Draggable Floating Fullscreen Button
 * Allows dragging anywhere on screen to avoid covering settings or avatar
 */
const DraggableFullscreenButton: React.FC<{ toggleFullscreen: () => void }> = ({
  toggleFullscreen,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    return { x: 12, y: 56 }; // Default: top right, below top bar, doesn't block settings or lobby header
  });

  const isDraggingRef = useRef(false);
  const startCoordRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startCoordRef.current = { x: e.clientX, y: e.clientY };
    startPosRef.current = { ...pos };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startCoordRef.current.x;
    const dy = e.clientY - startCoordRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMovedRef.current = true;
    }
    // Note: in right-positioned coordinates:
    // right = startPos.x - dx
    // top = startPos.y + dy
    const nextX = Math.max(4, Math.min(window.innerWidth - 60, startPosRef.current.x - dx));
    const nextY = Math.max(4, Math.min(window.innerHeight - 50, startPosRef.current.y + dy));
    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (!hasMovedRef.current) {
      toggleFullscreen();
    }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { isDraggingRef.current = false; }}
      style={{
        right: `${pos.x}px`,
        top: `${pos.y}px`,
        touchAction: 'none',
      }}
      className="absolute z-50 p-1.5 sm:p-2 rounded-full bg-black/75 hover:bg-black/90 active:scale-95 text-amber-300 hover:text-white border border-amber-400/50 shadow-2xl backdrop-blur-md transition-shadow flex items-center gap-1 text-[11px] font-bold cursor-grab active:cursor-grabbing select-none"
      title="点击全屏，按住可随意拖拽移动位置"
    >
      <Maximize2 className="w-3.5 h-3.5" />
      <span className="text-[10px] sm:text-xs">全屏</span>
      <Move className="w-2.5 h-2.5 opacity-60 ml-0.5" />
    </button>
  );
};

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

          {/* Floating Immersive Fullscreen Entry / Exit Toggle Button (Draggable & integrated) */}
          {!isFullscreen && (
            <DraggableFullscreenButton toggleFullscreen={toggleFullscreen} />
          )}
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};

