import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'deep-green' | 'lake-blue';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  themeConfig: {
    name: string;
    bgClass: string;
    panelClass: string;
    headerClass: string;
    feltGradient: string;
    outerBorder: string;
    accentColor: string;
    accentText: string;
    tagClass: string;
  };
}

const THEMES: Record<AppTheme, ThemeContextType['themeConfig']> = {
  'deep-green': {
    name: '护眼翡翠绿',
    bgClass: 'bg-[#114732]',
    panelClass: 'bg-[#145339]/95 border-emerald-400/40 text-emerald-50',
    headerClass: 'bg-[#134d35]/95 border-emerald-400/40',
    feltGradient: 'from-[#186443] via-[#23855a] to-[#155b3c]',
    outerBorder: 'border-[#0e3b28]',
    accentColor: 'emerald',
    accentText: 'text-emerald-200',
    tagClass: 'bg-[#0f402c]/90 text-emerald-200 border-emerald-400/40',
  },
  'lake-blue': {
    name: '护眼湖水蓝',
    bgClass: 'bg-[#12476b]',
    panelClass: 'bg-[#144f75]/95 border-cyan-400/40 text-cyan-50',
    headerClass: 'bg-[#134d73]/95 border-cyan-400/40',
    feltGradient: 'from-[#18608f] via-[#237eb5] to-[#14537c]',
    outerBorder: 'border-[#0d344d]',
    accentColor: 'cyan',
    accentText: 'text-cyan-200',
    tagClass: 'bg-[#0f3f5f]/90 text-cyan-200 border-cyan-400/40',
  },
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'deep-green',
  setTheme: () => {},
  toggleTheme: () => {},
  themeConfig: THEMES['deep-green'],
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('chudadi_app_theme') as AppTheme;
      if (saved === 'deep-green' || saved === 'lake-blue') return saved;
    } catch {
      // fallback
    }
    return 'deep-green'; // Default to eye-friendly Emerald Green
  });

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem('chudadi_app_theme', t);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'deep-green' ? 'lake-blue' : 'deep-green');
  };

  useEffect(() => {
    // Sync body background style for zero dark glare
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = theme === 'deep-green' ? '#114732' : '#12476b';
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        themeConfig: THEMES[theme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
