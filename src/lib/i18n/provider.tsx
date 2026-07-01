"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { dict, LOCALES, type Locale, type DictKey } from "./dict";

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);
const LS_KEY = "pawchive_locale";

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

function detectFromBrowser(): Locale {
  if (typeof navigator === "undefined") return "en";
  const langs = navigator.languages ?? [navigator.language];
  for (const raw of langs) {
    const l = raw.toLowerCase();
    if (l.startsWith("zh")) return "zh";
    if (l.startsWith("en")) return "en";
  }
  return "en";
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export function I18nProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initial);

  // Hydrate from localStorage on mount (overrides SSR-detected default)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (isLocale(stored) && stored !== locale) {
        setLocaleState(stored);
      } else if (!stored) {
        const browser = detectFromBrowser();
        if (browser !== locale) setLocaleState(browser);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect on html.lang and persist for SSR detection
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
    try {
      const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? ";secure" : "";
      document.cookie = `pawchive_locale=${locale};path=/;max-age=31536000;samesite=lax${secure}`;
    } catch {}
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem(LS_KEY, l); } catch {}
  }, []);

  const t = useCallback<I18nCtx["t"]>(
    (key, vars) => {
      const table = dict[locale] as Record<string, string>;
      const s = table[key] ?? (dict.en as Record<string, string>)[key] ?? key;
      return interpolate(s, vars);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx);
  if (!c) {
    // Allow calls outside provider — fall back to en dict
    return {
      locale: "en",
      setLocale: () => {},
      t: (key, vars) => interpolate((dict.en as Record<string, string>)[key] ?? key, vars),
    };
  }
  return c;
}
