import React, { createContext, useState, useContext, useEffect } from 'react';
import es from '../locales/es.json';
import en from '../locales/en.json';
import pl from '../locales/pl.json';

const LanguageContext = createContext();

const translations = {
  es,
  en,
  pl
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('es');

  useEffect(() => {
    const savedLanguage = document.cookie.split('; ').find(row => row.startsWith('language='));
    if (savedLanguage) {
      const lang = savedLanguage.split('=')[1];
      if (translations[lang]) {
        setLanguage(lang);
      }
    }
  }, []);

  const changeLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
      document.cookie = `language=${lang};path=/;max-age=31536000;SameSite=Lax`;
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        let fallback = translations['es'];
        for (const fk of keys) {
            if (fallback && fallback[fk]) {
                fallback = fallback[fk];
            } else {
                return key;
            }
        }
        value = fallback;
      }
    }

    if (typeof value === 'string' && params) {
      Object.keys(params).forEach(param => {
        value = value.replace(`{{${param}}}`, params[param]);
      });
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
