"use client";

import { useTranslation } from "@/components/locale-provider";
import { useTheme } from "@/components/theme-provider";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: { id: ThemeMode; labelKey: "theme.light" | "theme.dark" | "theme.auto" }[] = [
  { id: "light", labelKey: "theme.light" },
  { id: "dark", labelKey: "theme.dark" },
  { id: "system", labelKey: "theme.auto" }
];

type ThemeSelectorProps = {
  /** Compact row inside the header menu dropdown. */
  variant?: "header" | "menu";
};

export function ThemeSelector({ variant = "header" }: ThemeSelectorProps) {
  const { mode, setMode } = useTheme();
  const { t } = useTranslation();

  if (variant === "menu") {
    return (
      <div className="app-menu-theme" role="group" aria-label={t("theme.ariaLabel")}>
        <p className="app-menu-theme-label" id="app-menu-theme-label">
          {t("theme.label")}
        </p>
        <div aria-labelledby="app-menu-theme-label" className="app-menu-theme-options">
          {OPTIONS.map((option) => (
            <button
              key={option.id}
              aria-pressed={mode === option.id}
              className={`app-menu-theme-option${mode === option.id ? " app-menu-theme-option--active" : ""}`}
              type="button"
              onClick={() => setMode(option.id)}
            >
              {t(option.labelKey)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="theme-selector event-tab-bar" aria-label={t("theme.label")}>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          aria-pressed={mode === option.id}
          className={mode === option.id ? "active" : ""}
          type="button"
          onClick={() => setMode(option.id)}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </nav>
  );
}
