"use client";

import { Moon, Sun } from "lucide-react";
import { COLOR_THEMES, type ColorTheme } from "@/lib/theme";
import { useTheme } from "@/components/theme-provider";

const THEME_LABELS: Record<ColorTheme, string> = {
  light: "Light",
  dark: "Dark"
};

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-selector" role="group" aria-label="Color theme">
      {COLOR_THEMES.map((value) => {
        const active = theme === value;
        const Icon = value === "light" ? Sun : Moon;
        return (
          <button
            key={value}
            aria-pressed={active}
            className={active ? "active" : undefined}
            title={`${THEME_LABELS[value]} theme`}
            type="button"
            onClick={() => setTheme(value)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{THEME_LABELS[value]}</span>
          </button>
        );
      })}
    </div>
  );
}
