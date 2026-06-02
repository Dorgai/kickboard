"use client";

import { useTheme } from "@/components/theme-provider";
import type { ThemeMode } from "@/lib/theme";

const OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "Auto" }
];

export function ThemeSelector() {
  const { mode, setMode } = useTheme();

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
