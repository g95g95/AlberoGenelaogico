import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { useTreeStore } from "@/stores/treeStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useUiStore } from "@/stores/uiStore";

interface HeaderProps {
  saveStatus: "saved" | "saving" | "idle";
  onImportExport: () => void;
}

export function Header({ saveStatus, onImportExport }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const persons = useTreeStore((s) => s.persons);
  const meta = useTreeStore((s) => s.meta);
  const clearProject = useTreeStore((s) => s.clearProject);
  const theme = useSettingsStore((s) => s.theme);
  const locale = useSettingsStore((s) => s.locale);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const selectPerson = useUiStore((s) => s.selectPerson);
  const openDetailPanel = useUiStore((s) => s.openDetailPanel);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const setSearchResults = useUiStore((s) => s.setSearchResults);
  const showConfirmDialog = useUiStore((s) => s.showConfirmDialog);
  const closeDetailPanel = useUiStore((s) => s.closeDetailPanel);

  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(persons, {
        keys: ["firstName", "lastName", "birthPlace"],
        threshold: 0.3,
      }),
    [persons]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return fuse.search(query).map((r) => r.item);
  }, [query, fuse]);

  useEffect(() => {
    setSearchQuery(query);
    const ids = results.map((r) => r.id);
    setSearchResults(ids);
  }, [query, results.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectResult = (id: string) => {
    selectPerson(id);
    openDetailPanel(id);
    setShowResults(false);
    setQuery("");
  };

  const toggleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const toggleLocale = () => {
    const next = locale === "it" ? "en" : "it";
    setLocale(next);
    i18n.changeLanguage(next);
  };

  const handleNewProject = () => {
    if (persons.length === 0) return;
    showConfirmDialog(
      t("app.newProject"),
      t("app.newProjectConfirm"),
      () => {
        closeDetailPanel();
        selectPerson(null);
        clearProject();
        localStorage.removeItem("familytree-project");
      }
    );
  };

  return (
    <header className="h-14 px-4 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm shrink-0 dark:bg-bg-dark/80 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-salvia">{t("app.title")}</h1>
        <span className="text-xs text-gray-400 hidden sm:block">{meta.name}</span>
        {persons.length > 0 && (
          <button
            onClick={handleNewProject}
            title={t("app.newProject")}
            aria-label={t("app.newProject")}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="7" y1="1" x2="7" y2="13" />
              <line x1="1" y1="7" x2="13" y2="7" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div ref={searchRef} className="relative hidden sm:block">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder={t("app.search")}
            aria-label={t("app.search")}
            className="w-48 lg:w-64 rounded-xl border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-salvia focus:outline-none focus:ring-2 focus:ring-salvia/30 dark:border-gray-600 dark:bg-surface-dark dark:text-gray-100"
          />
          {showResults && results.length > 0 && (
            <div className="absolute top-full mt-1 left-0 w-full bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-60 overflow-y-auto dark:bg-surface-dark dark:border-gray-700">
              {results.map((person) => (
                <button
                  key={person.id}
                  onClick={() => handleSelectResult(person.id)}
                  aria-label={`${person.firstName} ${person.lastName}`}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-xl last:rounded-b-xl"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {person.firstName} {person.lastName}
                  </span>
                  {person.birthPlace && (
                    <span className="text-xs text-gray-400 ml-2">
                      {person.birthPlace}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-xs text-gray-400">
          {saveStatus === "saving" ? t("app.saving") : saveStatus === "saved" ? t("app.saved") : ""}
        </span>

        <button
          onClick={toggleTheme}
          title={t("settings.theme")}
          aria-label={t("settings.theme")}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 1zm0 10a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 11zm7-3a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2a.5.5 0 01.5.5zM5 8a.5.5 0 01-.5.5h-2a.5.5 0 010-1h2A.5.5 0 015 8zm8.354-3.354a.5.5 0 010 .708l-1.414 1.414a.5.5 0 11-.708-.708l1.414-1.414a.5.5 0 01.708 0zm-9.192 9.192a.5.5 0 010 .708l-1.414 1.414a.5.5 0 01-.708-.708L3.454 13.84a.5.5 0 01.708 0zM13.354 11.354a.5.5 0 00-.708 0l-1.414 1.414a.5.5 0 00.708.708l1.414-1.414a.5.5 0 000-.708zM4.162 2.748a.5.5 0 00-.708 0L2.04 4.162a.5.5 0 00.708.708L4.162 3.456a.5.5 0 000-.708zM8 5a3 3 0 100 6 3 3 0 000-6z" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 1a5 5 0 009 3A7 7 0 116 1z" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleLocale}
          title={t("settings.language")}
          aria-label={t("settings.language")}
          className="px-2 py-1 rounded-xl text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
        >
          {locale}
        </button>

        <button
          onClick={onImportExport}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salvia/50"
          title={`${t("import.title")}/${t("export.title")}`}
          aria-label={`${t("import.title")}/${t("export.title")}`}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3" />
            <path d="M8 2v9M5 5l3-3 3 3" />
          </svg>
        </button>
      </div>
    </header>
  );
}
