import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "./it.json";
import en from "./en.json";

const STORAGE_KEY = "familytree-settings";

function getSavedLocale(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.locale) return settings.locale;
    }
  } catch {
    // ignore
  }
  return "it";
}

i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: getSavedLocale(),
  fallbackLng: "it",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
