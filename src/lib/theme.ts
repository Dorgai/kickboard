export const THEME_STORAGE_KEY = "kickboard-theme";

export type ColorTheme = "light" | "dark";

export const COLOR_THEMES: ColorTheme[] = ["light", "dark"];

export function isColorTheme(value: string | null | undefined): value is ColorTheme {
  return value === "light" || value === "dark";
}

export function resolveInitialTheme(): ColorTheme {
  if (typeof window === "undefined") return "light";

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isColorTheme(stored)) return stored;
  } catch {
    /* localStorage may be blocked */
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyColorTheme(theme: ColorTheme) {
  document.documentElement.dataset.theme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#111827" : "#1A56DB");
  }
}

/** Runs before paint to avoid a light flash when dark mode is saved. */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="dark"?"#111827":"#1A56DB");}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
