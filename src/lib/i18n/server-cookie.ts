import { cookies } from "next/headers";
import { LOCALE_COOKIE, normalizeAppLocale, type AppLocale } from "@/lib/i18n/locales";

export async function readLocaleCookieServer(): Promise<AppLocale | null> {
  const jar = await cookies();
  const value = jar.get(LOCALE_COOKIE)?.value;
  if (!value) return null;
  return normalizeAppLocale(value);
}
