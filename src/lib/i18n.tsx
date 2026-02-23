"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Locale = "ja" | "en";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: "ja",
  setLocale: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("locale") as Locale | null;
    if (saved === "ja" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useLocale() {
  return useContext(I18nContext);
}

/**
 * Inline translation component.
 * <T ja="プロジェクト" en="Projects" />
 */
export function T({ ja, en }: { ja: string; en: string }) {
  const { locale } = useLocale();
  return <>{locale === "ja" ? ja : en}</>;
}

/**
 * Pick localized text from ja/en pair.
 * <LT ja={item.nameJa} en={item.name} />
 * Falls back to en if ja is empty.
 */
export function LT({ ja, en }: { ja?: string | null; en: string }) {
  const { locale } = useLocale();
  if (locale === "ja" && ja) return <>{ja}</>;
  return <>{en}</>;
}
