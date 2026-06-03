"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "light";
}

function applyResolvedTheme(resolved: "light" | "dark") {
  document.documentElement.dataset.theme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", resolved === "dark" ? THEME_META_DARK : THEME_META_LIGHT);
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  useEffect(() => {
    setModeState(readStoredMode());
    setResolved(resolveTheme(readStoredMode()));
  }, []);

  useEffect(() => {
    const next = resolveTheme(mode);
    setResolved(next);
    applyResolvedTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

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
