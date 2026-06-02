export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "kickboard-theme";

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/** Inline script to set `data-theme` before paint (avoids flash). */
export const themeInitScript = `(function(){try{var k="kickboard-theme";var s=localStorage.getItem(k);var d=document.documentElement;var dark=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";}catch(e){}})();`;
