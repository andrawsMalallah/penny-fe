import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AppearancePreference } from '../api/types';

const STORAGE_KEY = 'penny.appearance';

function readStoredAppearance(): AppearancePreference {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {
    // Ignore storage error
  }
  return 'system';
}

interface ThemeContextValue {
  appearance: AppearancePreference;
  resolvedTheme: 'light' | 'dark';
  setAppearance: (pref: AppearancePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearanceState] = useState<AppearancePreference>(() =>
    readStoredAppearance()
  );
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  const setAppearance = useCallback((pref: AppearancePreference) => {
    setAppearanceState(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Ignore storage error
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ appearance, resolvedTheme, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
