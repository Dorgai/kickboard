"use client";

import { useTranslation } from "@/components/locale-provider";
import { APP_LOCALES, LOCALE_LABELS } from "@/lib/i18n/locales";

type LanguageSelectorProps = {
  variant?: "header" | "menu" | "onboarding";
  onSelect?: (locale: string) => void;
  value?: string;
};

export function LanguageSelector({ variant = "menu", onSelect, value }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useTranslation();
  const active = value ?? locale;

  async function choose(next: (typeof APP_LOCALES)[number]) {
    if (onSelect) {
      onSelect(next);
      return;
    }
    await setLocale(next);
  }

  if (variant === "onboarding") {
    return (
      <fieldset className="app-menu-theme locale-onboarding-field">
        <legend className="feed-control-field">{t("auth.chooseLanguage")}</legend>
        <p className="community-setup-note">{t("auth.chooseLanguageHint")}</p>
        <div className="app-menu-theme-options" role="radiogroup" aria-label={t("auth.chooseLanguage")}>
          {APP_LOCALES.map((option) => (
            <label key={option} className="locale-onboarding-option">
              <input
                checked={active === option}
                name="locale"
                type="radio"
                value={option}
                onChange={() => void choose(option)}
              />
              <span>{LOCALE_LABELS[option]}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (variant === "menu") {
    return (
      <div className="app-menu-theme" role="group" aria-label={t("common.language")}>
        <p className="app-menu-theme-label" id="app-menu-language-label">
          {t("common.language")}
        </p>
        <div aria-labelledby="app-menu-language-label" className="app-menu-theme-options">
          {APP_LOCALES.map((option) => (
            <button
              key={option}
              aria-pressed={active === option}
              className={`app-menu-theme-option${active === option ? " app-menu-theme-option--active" : ""}`}
              type="button"
              onClick={() => void choose(option)}
            >
              {LOCALE_LABELS[option]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="theme-selector event-tab-bar" aria-label={t("common.language")}>
      {APP_LOCALES.map((option) => (
        <button
          key={option}
          aria-pressed={active === option}
          className={active === option ? "active" : ""}
          type="button"
          onClick={() => void choose(option)}
        >
          {LOCALE_LABELS[option]}
        </button>
      ))}
    </nav>
  );
}
