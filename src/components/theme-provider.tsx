"use client";

import { useSession } from "next-auth/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  MOBILE_THEME_MEDIA,
  resolveTheme,
  THEME_META_DARK,
  THEME_META_LIGHT,
  THEME_STORAGE_KEY,
  type ThemeMode
} from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "dark";
}

function applyResolvedTheme(resolved: "light" | "dark") {
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? THEME_META_DARK : THEME_META_LIGHT);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const syncingFromServerRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = readStoredMode();
    setModeState(stored);
    setResolved(resolveTheme(stored));
  }, []);

  useEffect(() => {
    const next = resolveTheme(mode);
    setResolved(next);
    applyResolvedTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, mode);

    if (syncingFromServerRef.current) return;
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId) return;

    void fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeMode: mode })
    }).catch(() => {
      /* offline or session race */
    });
  }, [mode, session?.user?.id, status]);

  useEffect(() => {
    if (mode !== "system") return;
    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const viewport = window.matchMedia(MOBILE_THEME_MEDIA);
    function onChange() {
      const next = resolveTheme("system");
      setResolved(next);
      applyResolvedTheme(next);
    }
    colorScheme.addEventListener("change", onChange);
    viewport.addEventListener("change", onChange);
    return () => {
      colorScheme.removeEventListener("change", onChange);
      viewport.removeEventListener("change", onChange);
    };
  }, [mode]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (status !== "authenticated" || !userId) {
      syncedUserIdRef.current = null;
      return;
    }
    const activeUserId = userId;
    if (syncedUserIdRef.current === activeUserId) return;

    let cancelled = false;

    async function loadServerTheme() {
      try {
        const response = await fetch("/api/user/preferences", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as { themeMode?: ThemeMode };
        if (
          cancelled ||
          (payload.themeMode !== "light" &&
            payload.themeMode !== "dark" &&
            payload.themeMode !== "system")
        ) {
          return;
        }
        syncingFromServerRef.current = true;
        syncedUserIdRef.current = activeUserId;
        setModeState(payload.themeMode);
        window.requestAnimationFrame(() => {
          syncingFromServerRef.current = false;
        });
      } catch {
        syncedUserIdRef.current = activeUserId;
      }
    }

    void loadServerTheme();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, status]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, resolved, setMode }), [mode, resolved, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
