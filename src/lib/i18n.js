import React, { createContext, useContext, useEffect, useState } from "react";
import { TRANSLATIONS } from "../data/translations.js";

/* Lightweight, dependency-free i18n.
   - Supported language list lives here for routing/UI.
   - Strings live in src/data/translations.js, keyed by dot-namespaced ID.
   - The active language is persisted to localStorage and reflected on the
     <html lang> attribute. Fallback chain: current language → English → key. */

export const LANGUAGES = [
  { code: "en", nativeLabel: "English",   englishLabel: "English"    },
  { code: "es", nativeLabel: "Español",   englishLabel: "Spanish"    },
  { code: "fr", nativeLabel: "Français",  englishLabel: "French"     },
  { code: "it", nativeLabel: "Italiano",  englishLabel: "Italian"    },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese" },
  { code: "ko", nativeLabel: "한국어",     englishLabel: "Korean"     },
  { code: "zh", nativeLabel: "中文",       englishLabel: "Mandarin"   },
];

const STORAGE_KEY = "tpdm-lang";
const I18nCtx = createContext({ lang: "en", setLang: () => {}, t: (k) => k });

function readInitialLang() {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.find(l => l.code === stored)) return stored;
    const browser = (window.navigator.language || "").slice(0, 2).toLowerCase();
    if (browser && LANGUAGES.find(l => l.code === browser)) return browser;
  } catch (e) { /* localStorage unavailable */ }
  return "en";
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(readInitialLang);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
      document.documentElement.setAttribute("lang", lang);
    }
  }, [lang]);

  function setLang(code) {
    if (LANGUAGES.find(l => l.code === code)) setLangState(code);
  }

  function t(key) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    if (dict[key] != null) return dict[key];
    if (TRANSLATIONS.en[key] != null) return TRANSLATIONS.en[key];
    return key;
  }

  return React.createElement(I18nCtx.Provider, { value: { lang, setLang, t } }, children);
}

export function useI18n() { return useContext(I18nCtx); }
