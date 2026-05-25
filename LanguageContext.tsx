import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, TranslationKey, Lang } from '../lib/i18n';

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('amerni_lang') as Lang) || 'ar';
  });

  const setLang = (l: Lang) => {
    localStorage.setItem('amerni_lang', l);
    setLangState(l);
  };

  const isRTL = lang === 'ar';

  useEffect(() => {
    const html = document.documentElement;
    html.dir = isRTL ? 'rtl' : 'ltr';
    html.lang = lang;
  }, [lang, isRTL]);

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
