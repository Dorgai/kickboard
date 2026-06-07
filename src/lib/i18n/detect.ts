import { DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from "@/lib/i18n/locales";

const GERMAN_COUNTRIES = new Set(["DE", "AT", "LI"]);
const FRENCH_COUNTRIES = new Set(["FR", "MC", "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GA", "CG", "CD"]);
const HUNGARIAN_COUNTRIES = new Set(["HU"]);

/** Prefer browser language tags, then country hints for DE/FR/HU territories. */
export function detectAppLocale(input: {
  acceptLanguage?: string | null;
  countryCode?: string | null;
}): AppLocale {
  const tags = parseAcceptLanguage(input.acceptLanguage);
  for (const tag of tags) {
    const locale = normalizeAppLocale(tag);
    if (locale !== DEFAULT_LOCALE || tag.startsWith("en")) {
      return locale;
    }
  }

  const country = input.countryCode?.trim().toUpperCase() ?? "";
  if (country === "CH" || country === "BE" || country === "LU" || country === "CA") {
    const primary = tags[0] ? normalizeAppLocale(tags[0]) : DEFAULT_LOCALE;
    if (primary === "de" || primary === "fr" || primary === "hu") return primary;
  }
  if (GERMAN_COUNTRIES.has(country)) return "de";
  if (FRENCH_COUNTRIES.has(country)) return "fr";
  if (HUNGARIAN_COUNTRIES.has(country)) return "hu";
  if (country === "CA") return "fr";

  return DEFAULT_LOCALE;
}

function parseAcceptLanguage(header: string | null | undefined) {
  if (!header?.trim()) return [] as string[];
  return header
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter((tag): tag is string => Boolean(tag));
}
