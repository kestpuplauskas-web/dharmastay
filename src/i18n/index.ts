import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import lt from "./locales/lt.json";
import en from "./locales/en.json";

/** Vienintelė vieta, kur registruojamos palaikomos kalbos. */
export const SUPPORTED_LANGUAGES = [
  { code: "lt", labelKey: "language.lt" },
  { code: "en", labelKey: "language.en" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: LanguageCode = "lt";
export const LANGUAGE_STORAGE_KEY = "revoo.lang";

export function isSupportedLanguage(v: unknown): v is LanguageCode {
  return SUPPORTED_LANGUAGES.some((l) => l.code === v);
}

/** Saugiai nuskaito išsaugotą kalbą (naršyklėje). Serveryje visada grąžina numatytąją. */
export function readStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function storeLanguage(code: LanguageCode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // localStorage gali būti išjungtas — kalba tiesiog neišliks, bet programa veiks
  }
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      lt: { translation: lt },
      en: { translation: en },
    },
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
