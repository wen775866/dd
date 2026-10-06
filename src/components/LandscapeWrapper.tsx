import React, { useState, useEffect, createContext, useContext } from 'react';

interface LandscapeContextType {
  isLandscape: boolean;
  isRotated: boolean;
}

export const LandscapeContext = createContext<LandscapeContextType>({
  isLandscape: true,
  isRotated: false,
});

export const useLandscape = () => useContext(LandscapeContext);

interface LandscapeWrapperProps {
  children: React.ReactNode;
}

export const LandscapeWrapper: React.FC<LandscapeWrapperProps> = ({ children }) => {
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
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
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
  // - If already landscape (e.g. Chrome PWA standalone mode, landscape phone, PC): render directly at 0deg.
  const containerWidth = isPortrait ? dimensions.height : dimensions.width;
  const containerHeight = isPortrait ? dimensions.width : dimensions.height;
  const rotationTransform = isPortrait
    ? 'translate(-50%, -50%) rotate(90deg)'
    : 'translate(-50%, -50%) rotate(0deg)';

  return (
    <LandscapeContext.Provider value={{ isLandscape: true, isRotated: isPortrait }}>
      <div className="fixed inset-0 w-screen h-screen bg-[#050b14] overflow-hidden select-none">
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
          }}
          className="bg-slate-950 flex flex-col justify-between relative shadow-2xl"
        >
          {/* Main Game Interface (Lobby / Tabletop) */}
          {children}
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};
