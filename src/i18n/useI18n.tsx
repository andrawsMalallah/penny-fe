import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { LanguageCode } from '../api/types';
import { translations } from './translations';

const STORAGE_KEY = 'penny.language';

function readStoredLanguage(): LanguageCode {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === 'ar' || val === 'en') return val;
  } catch {
    // Ignore storage restriction
  }
  return 'en';
}

interface I18nContextValue {
  language: LanguageCode;
  dir: 'ltr' | 'rtl';
  t: typeof translations.en;
  setLanguage: (lang: LanguageCode) => void;
  format: (template: string, vars: Record<string, string | number>) => string;
  categoryLabel: (cat: {
    name_en?: string | null;
    name_ar?: string | null;
    name?: string | null;
  }) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(() => readStoredLanguage());

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage restriction
    }
  }, []);

  useEffect(() => {
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language]);

  const format = useCallback((template: string, vars: Record<string, string | number>) => {
    return Object.entries(vars).reduce(
      (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
      template
    );
  }, []);

  const categoryLabel = useCallback(
    (cat: { name_en?: string | null; name_ar?: string | null; name?: string | null }) => {
      if (language === 'ar') {
        return cat.name_ar?.trim() || cat.name_en?.trim() || cat.name?.trim() || '—';
      }
      return cat.name_en?.trim() || cat.name_ar?.trim() || cat.name?.trim() || '—';
    },
    [language]
  );

  const t = translations[language] as typeof translations.en;

  return (
    <I18nContext.Provider
      value={{
        language,
        dir: language === 'ar' ? 'rtl' : 'ltr',
        t,
        setLanguage,
        format,
        categoryLabel,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
