"use client";

import { HelpTooltip } from "@/components/help-tooltip";
import { useTheme } from "@/components/theme-provider";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" }
];

type ThemeSelectorProps = {
  /** Compact row inside the header menu dropdown. */
  variant?: "header" | "menu";
};

export function ThemeSelector({ variant = "header" }: ThemeSelectorProps) {
  const { mode, setMode } = useTheme();

  if (variant === "menu") {
    return (
      <div className="app-menu-theme" role="group" aria-label="Color theme">
        <p className="app-menu-theme-label panel-help-row" id="app-menu-theme-label">
          Theme
          <HelpTooltip label="Auto theme behavior" size="sm">
            Auto is light on mobile; on desktop it follows your device.
          </HelpTooltip>
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
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <nav className="theme-selector event-tab-bar" aria-label="Color theme">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          aria-pressed={mode === option.id}
          className={mode === option.id ? "active" : ""}
          type="button"
          onClick={() => setMode(option.id)}
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
