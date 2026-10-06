import React, { useState, useEffect, createContext, useContext } from 'react';

interface LandscapeContextType {
  isLandscape: boolean;
}

export const LandscapeContext = createContext<LandscapeContextType>({
  isLandscape: true,
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

  // Fixed 90-degree rotation geometry:
  // Container width equals physical screen height; Container height equals physical screen width.
  const containerWidth = dimensions.height;
  const containerHeight = dimensions.width;

  return (
    <LandscapeContext.Provider value={{ isLandscape: true }}>
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
        </div>
      </div>
    </LandscapeContext.Provider>
  );
};
