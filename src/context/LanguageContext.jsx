// src/context/LanguageContext.jsx
// Global Language Context & i18n Hook for Washdoor

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SAMPLE_LANGUAGES, translations } from '../i18n/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'washdoor_selected_language';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const match = SAMPLE_LANGUAGES.find((l) => l.code === parsed?.code);
        if (match) return match;
      }
    } catch {}
    return SAMPLE_LANGUAGES[0]; // Default: English
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

  const setLanguage = useCallback((newLang) => {
    if (!newLang) return;
    const match = SAMPLE_LANGUAGES.find((l) => l.code === (newLang.code || newLang));
    if (match) {
      setLanguageState(match);
    }
  }, []);

  /**
   * Translate function
   * @param {string} key - The dictionary key
   * @param {object|string} [paramsOrFallback] - Object with interpolation values OR string fallback
   * @returns {string} Translated string
   */
  const t = useCallback(
    (key, paramsOrFallback) => {
      if (!key) return '';

      const langCode = language.code || 'en';
      const langDict = translations[langCode] || {};
      const enDict = translations.en || {};

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

  const value = {
    language,
    currentLanguage: language, // Aliased for convenience
    setLanguage,
    setCurrentLanguage: setLanguage, // Aliased for convenience
    languages: SAMPLE_LANGUAGES,
    SAMPLE_LANGUAGES,
    t,
    isRtl: language.code === 'ar',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: SAMPLE_LANGUAGES[0],
      currentLanguage: SAMPLE_LANGUAGES[0],
      setLanguage: () => {},
      setCurrentLanguage: () => {},
      languages: SAMPLE_LANGUAGES,
      SAMPLE_LANGUAGES,
      t: (key, paramsOrFallback) => {
        if (!key) return '';
        if (typeof paramsOrFallback === 'string') return paramsOrFallback;
        return translations.en?.[key] || key;
      },
      isRtl: false,
    };
  }
  return context;
}
