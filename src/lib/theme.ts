export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "kickboard-theme";

/** Browser chrome / meta theme-color when light theme is active. */
export const THEME_META_LIGHT = "#16a34a";
export const THEME_META_DARK = "#111827";

/** Light UI brand (youthful green). Keep in sync with globals.css `:root` tokens. */
export const LIGHT_BRAND = "#16a34a";
export const LIGHT_BRAND_LIGHT = "#dcfce7";
export const LIGHT_ACCENT = "#16a34a";

/** Viewports treated as mobile for default light theme when mode is Auto. */
export const MOBILE_THEME_MEDIA = "(max-width: 768px)";

export function isMobileThemeContext() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_THEME_MEDIA).matches;
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined" && isMobileThemeContext()) {
    return "light";
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/** Inline script to set `data-theme` before paint (avoids flash). */
export const themeInitScript = `(function(){try{var k="kickboard-theme";var s=localStorage.getItem(k);var d=document.documentElement;var mobile=window.matchMedia("${MOBILE_THEME_MEDIA}").matches;var dark=s==="dark"||(s==="system"&&!mobile&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.dataset.theme=dark?"dark":"light";}catch(e){}})();`;
