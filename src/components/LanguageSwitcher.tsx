import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "rentivo-lang";

export function useLanguageBootstrap() {
  const { i18n } = useTranslation();
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved !== i18n.language) i18n.changeLanguage(saved);
    } catch {}
  }, [i18n]);
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("en") ? "en" : "lt";

  const set = (l: "lt" | "en") => {
    i18n.changeLanguage(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  return (
    <div className={cn("inline-flex items-center gap-1 text-sm font-medium", className)}>
      <button
        type="button"
        onClick={() => set("lt")}
        className={cn("px-1.5 transition", lang === "lt" ? "opacity-100" : "opacity-60 hover:opacity-100")}
        aria-pressed={lang === "lt"}
      >
        LT
      </button>
      <span className="opacity-50">|</span>
      <button
        type="button"
        onClick={() => set("en")}
        className={cn("px-1.5 transition", lang === "en" ? "opacity-100" : "opacity-60 hover:opacity-100")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
    </div>
  );
}
