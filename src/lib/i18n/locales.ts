export const APP_LOCALES = ["en", "de", "fr"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_COOKIE = "kickboard-locale";
export const DEFAULT_LOCALE: AppLocale = "en";

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français"
};

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return Boolean(value && (APP_LOCALES as readonly string[]).includes(value));
}

export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_LOCALE;
  const lower = value.trim().toLowerCase();
  if (lower === "de" || lower.startsWith("de-")) return "de";
  if (lower === "fr" || lower.startsWith("fr-")) return "fr";
  if (lower === "en" || lower.startsWith("en-")) return "en";
  return DEFAULT_LOCALE;
}
