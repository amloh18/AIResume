'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: Theme | ThemePreference) => void;
  isDark: boolean;
  isLight: boolean;
  isSystem: boolean;
  resetToSystem: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [theme, setThemeState] = useState<Theme>('light');
  const [isInitialized, setIsInitialized] = useState(false);

  const getSystemTheme = (): Theme => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const applyThemeClass = (activeTheme: Theme) => {
    if (typeof document !== 'undefined') {
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    // Load preference from localStorage
    const savedTheme = localStorage.getItem('theme');
    let initialPref: ThemePreference = 'system';
    let initialActive: Theme = getSystemTheme();

    if (savedTheme === 'light' || savedTheme === 'dark') {
      initialPref = savedTheme;
      initialActive = savedTheme;
    } else {
      // Default to system preference for all new users or non-overridden states
      initialPref = 'system';
      initialActive = getSystemTheme();
    }

    setThemePreference(initialPref);
    setThemeState(initialActive);
    applyThemeClass(initialActive);
    setIsInitialized(true);

    // Listen to live OS system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      const currentSaved = localStorage.getItem('theme');
      if (!currentSaved || currentSaved === 'system') {
        const newTheme: Theme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyThemeClass(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  const setTheme = (newTheme: Theme | ThemePreference) => {
    if (newTheme === 'system') {
      localStorage.removeItem('theme');
      setThemePreference('system');
      const sysTheme = getSystemTheme();
      setThemeState(sysTheme);
      applyThemeClass(sysTheme);
    } else {
      // Manual override
      localStorage.setItem('theme', newTheme);
      setThemePreference(newTheme);
      setThemeState(newTheme);
      applyThemeClass(newTheme);
    }
  };

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  const resetToSystem = () => {
    setTheme('system');
  };

  const value: ThemeContextType = {
    theme,
    themePreference,
    toggleTheme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: themePreference === 'system',
    resetToSystem
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
