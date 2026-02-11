import { create } from "zustand";
import type { Settings } from "@/types/domain";

const STORAGE_KEY = "familytree-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Settings;
  } catch {
    // ignore
  }
  return { theme: "system", locale: "it" };
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function getEffectiveTheme(theme: Settings["theme"]): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(theme: Settings["theme"]) {
  const effective = getEffectiveTheme(theme);
  document.documentElement.classList.toggle("dark", effective === "dark");
}

interface SettingsState extends Settings {
  setTheme: (theme: Settings["theme"]) => void;
  setLocale: (locale: Settings["locale"]) => void;
  getEffectiveTheme: () => "light" | "dark";
}

const initial = loadSettings();
applyTheme(initial.theme);

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...initial,

  setTheme: (theme) => {
    applyTheme(theme);
    const next = { ...get(), theme };
    saveSettings({ theme: next.theme, locale: next.locale });
    set({ theme });
  },

  setLocale: (locale) => {
    const next = { ...get(), locale };
    saveSettings({ theme: next.theme, locale: next.locale });
    set({ locale });
  },

  getEffectiveTheme: () => getEffectiveTheme(get().theme),
}));
