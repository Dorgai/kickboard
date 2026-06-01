"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  applyColorTheme,
  isColorTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type ColorTheme
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>("light");

  useEffect(() => {
    const initial = resolveInitialTheme();
    const applied = document.documentElement.dataset.theme;
    const resolved = isColorTheme(applied) ? applied : initial;
    setThemeState(resolved);
    applyColorTheme(resolved);
  }, []);

  const setTheme = useCallback((next: ColorTheme) => {
    setThemeState(next);
    applyColorTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
