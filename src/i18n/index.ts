import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import lt from "./locales/lt.json";
import en from "./locales/en.json";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      lt: { translation: lt },
      en: { translation: en },
    },
    lng: "lt",
    fallbackLng: "lt",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
