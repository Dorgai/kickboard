/** mypicks.live wordmark palette (navy on paper). */
export const LOGO_NAVY = "#14213d";
export const LOGO_PAPER = "#f3f2ee";

export const WORDMARK_FONT =
  "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/** Shared layout for SVG + React wordmark (viewBox 320×72). */
export const WORDMARK_LAYOUT = {
  mypicks: {
    x: 2,
    y: 44,
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: "-0.04em"
  },
  live: {
    x: 206,
    y: 58,
    fontSize: 20,
    fontWeight: 400,
    letterSpacing: "-0.02em"
  }
} as const;
