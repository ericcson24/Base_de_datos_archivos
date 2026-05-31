'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import es from '../locales/es.json';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

// los idiomas que tenemos
type LangKey = 'es' | 'en' | 'pl';

// el json de traducciones puede tener strings o mas objetos dentro
type TransNode = { [key: string]: string | TransNode };

type LanguageContextType = {
  language: LangKey;
  changeLanguage: (lang: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<LangKey, TransNode> = {
  es: es as TransNode,
  en: en as TransNode,
  pl: pl as TransNode,
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguage] = useState<LangKey>('es');

  useEffect(() => {
    const savedLanguage = document.cookie.split('; ').find((row) => row.startsWith('language='));
    if (savedLanguage) {
      const lang = savedLanguage.split('=')[1];
      if (lang === 'es' || lang === 'en' || lang === 'pl') {
        setLanguage(lang);
      }
    }
  }, []);

  const changeLanguage = (lang: string) => {
    if (lang === 'es' || lang === 'en' || lang === 'pl') {
      setLanguage(lang);
      document.cookie = `language=${lang};path=/;max-age=31536000;SameSite=Lax`;
    }
  };

  const t = (key: string, params: Record<string, string | number> = {}): string => {
    const keys = key.split('.');
    let value: string | TransNode = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && value[k]) {
        value = value[k];
      } else {
        let fallback: string | TransNode = translations['es'];
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fallback[fk]) {
            fallback = fallback[fk];
          } else {
            return key;
          }
        }
        value = fallback;
      }
    }

    if (typeof value === 'string' && params) {
      let text = value;
      Object.keys(params).forEach((param) => {
        text = text.replace(`{{${param}}}`, String(params[param]));
      });
      return text;
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
