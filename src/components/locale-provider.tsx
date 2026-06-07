"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { readLocaleCookie, writeLocaleCookie } from "@/lib/i18n/cookie";
import { translate, type MessageKey } from "@/lib/i18n/messages";
import { APP_LOCALES, DEFAULT_LOCALE, normalizeAppLocale, type AppLocale } from "@/lib/i18n/locales";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale, options?: { persist?: boolean }) => Promise<void>;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

async function fetchSuggestedLocale(): Promise<AppLocale | null> {
  try {
    const response = await fetch("/api/locale/suggest", { cache: "no-store" });
    if (!response.ok) return null;
    const payload = (await response.json()) as { locale?: string };
    return normalizeAppLocale(payload.locale);
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const sessionLocale = session?.user?.locale;
      if (sessionLocale && APP_LOCALES.includes(sessionLocale)) {
        if (!cancelled) {
          setLocaleState(sessionLocale);
          writeLocaleCookie(sessionLocale);
          setReady(true);
        }
        return;
      }

      const cookieLocale = readLocaleCookie();
      if (cookieLocale) {
        if (!cancelled) {
          setLocaleState(cookieLocale);
          setReady(true);
        }
        return;
      }

      if (status === "loading") return;

      const suggested = await fetchSuggestedLocale();
      if (!cancelled) {
        setLocaleState(suggested ?? DEFAULT_LOCALE);
        if (suggested) writeLocaleCookie(suggested);
        setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.locale, status]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const setLocale = useCallback(
    async (next: AppLocale, options?: { persist?: boolean }) => {
      const normalized = normalizeAppLocale(next);
      setLocaleState(normalized);
      writeLocaleCookie(normalized);

      const shouldPersist = options?.persist ?? Boolean(session?.user?.id);
      if (!shouldPersist) return;

      try {
        const response = await fetch("/api/user/locale", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: normalized })
        });
        if (response.ok) {
          await update({ locale: normalized });
        }
      } catch {
        /* cookie still updated */
      }
    },
    [session?.user?.id, update]
  );

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}

export function useTranslation() {
  const { locale, setLocale, t } = useLocale();
  return { locale, setLocale, t };
}
