/** mypicks.live wordmark palette (static assets / PWA tiles). */
export const LOGO_NAVY = "#14213d";
export const LOGO_LIVE = "#6b7280";
export const LOGO_PAPER = "#f3f2ee";
export const LOGO_INK_DARK = "#f9fafb";
export const LOGO_INK_DARK_MUTED = "#d1d5db";

export const WORDMARK_FONT =
  "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const WORDMARK_VIEWBOX = {
  width: 176,
  height: 72
} as const;

/** Shared layout for SVG + React wordmark. */
export const WORDMARK_LAYOUT = {
  mypicks: {
    x: 0,
    y: 44,
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: "-0.04em"
  },
  /** Right edge aligned with “mypicks” — sits under “ks”. */
  live: {
    x: 174,
    y: 56,
    fontSize: 20,
    fontWeight: 400,
    letterSpacing: "-0.02em",
    textAnchor: "end" as const
  }
} as const;
