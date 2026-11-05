// src/context/LanguageContext.tsx
// Global Language Context & i18n Hook for Washdoor

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SAMPLE_LANGUAGES, translations } from '../i18n/translations';

export interface LanguageItem {
  code: string;
  name: string;
  native: string;
  dir?: 'ltr' | 'rtl';
}

export interface LanguageContextType {
  language: LanguageItem;
  currentLanguage: LanguageItem;
  setLanguage: (newLang: LanguageItem | string) => void;
  setCurrentLanguage: (newLang: LanguageItem | string) => void;
  languages: LanguageItem[];
  SAMPLE_LANGUAGES: LanguageItem[];
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string) => string;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'washdoor_selected_language';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps): React.ReactElement {
  const [language, setLanguageState] = useState<LanguageItem>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = SAMPLE_LANGUAGES.find((l) => l.code === parsed?.code);
        if (match) return match as LanguageItem;
      }
    } catch {}
    return SAMPLE_LANGUAGES[0] as LanguageItem; // Default: English
  });

  // Apply html lang and dir attributes whenever language changes
  useEffect(() => {
    const isRtl = language.code === 'ar';
    document.documentElement.setAttribute('lang', language.code);
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.body.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    if (isRtl) {
      document.body.classList.add('rtl-layout');
    } else {
      document.body.classList.remove('rtl-layout');
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(language));
    } catch {}
  }, [language]);

  const setLanguage = useCallback((newLang: LanguageItem | string) => {
    if (!newLang) return;
    const targetCode = typeof newLang === 'string' ? newLang : newLang.code;
    const match = SAMPLE_LANGUAGES.find((l) => l.code === targetCode);
    if (match) {
      setLanguageState(match as LanguageItem);
    }
  }, []);

  /**
   * Translate function
   */
  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string): string => {
      if (!key) return '';

      const langCode = language.code || 'en';
      const langDict = (translations as Record<string, Record<string, string>>)[langCode] || {};
      const enDict = (translations as Record<string, Record<string, string>>).en || {};

      let text = langDict[key] ?? enDict[key];

      if (text === undefined || text === null) {
        if (typeof paramsOrFallback === 'string') {
          return paramsOrFallback;
        }
        return key;
      }

      // If params are passed as an object, interpolate {var}
      if (paramsOrFallback && typeof paramsOrFallback === 'object') {
        Object.entries(paramsOrFallback).forEach(([paramKey, paramVal]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
        });
      }

      return text;
    },
    [language.code]
  );

  const value: LanguageContextType = {
    language,
    currentLanguage: language,
    setLanguage,
    setCurrentLanguage: setLanguage,
    languages: SAMPLE_LANGUAGES as LanguageItem[],
    SAMPLE_LANGUAGES: SAMPLE_LANGUAGES as LanguageItem[],
    t,
    isRtl: language.code === 'ar',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: SAMPLE_LANGUAGES[0] as LanguageItem,
      currentLanguage: SAMPLE_LANGUAGES[0] as LanguageItem,
      setLanguage: () => {},
      setCurrentLanguage: () => {},
      languages: SAMPLE_LANGUAGES as LanguageItem[],
      SAMPLE_LANGUAGES: SAMPLE_LANGUAGES as LanguageItem[],
      t: (key: string, paramsOrFallback?: Record<string, string | number> | string) => {
        if (!key) return '';
        if (typeof paramsOrFallback === 'string') return paramsOrFallback;
        return (translations.en as Record<string, string>)?.[key] || key;
      },
      isRtl: false,
    };
  }
  return context;
}
