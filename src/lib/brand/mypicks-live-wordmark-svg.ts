import { LOGO_LIVE, LOGO_NAVY, LOGO_PAPER, LOGO_SHADOW } from "@/lib/brand/logo-colors";

type WordmarkOptions = {
  showLive?: boolean;
  width?: number;
  height?: number;
};

/** Horizontal lockup: mypicks + .live (matches provided brand art). */
export function myPicksLiveWordmarkSvg({
  showLive = true,
  width = 320,
  height = 72
}: WordmarkOptions = {}): string {
  const live = showLive
    ? `<text x="206" y="58" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="21" font-weight="700" fill="${LOGO_LIVE}">.live</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" width="${width}" height="${height}" role="img" aria-label="mypicks.live">
  <defs>
    <filter id="mp-depth" x="-8%" y="-20%" width="116%" height="150%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="1.8" flood-color="#0f172a" flood-opacity="0.22"/>
    </filter>
  </defs>
  <g filter="url(#mp-depth)">
    <text x="2" y="44" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="42" font-weight="800" letter-spacing="-0.04em" fill="${LOGO_NAVY}">mypicks</text>
    ${live}
  </g>
</svg>`;
}

/** Square app mark — paper tile with navy “m”. */
export function myPicksLiveMarkSvg(size = 512): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="mypicks.live">
  <defs>
    <filter id="mp-mark-depth" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="${size * 0.012}" stdDeviation="${size * 0.01}" flood-color="#0f172a" flood-opacity="0.2"/>
    </filter>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${LOGO_PAPER}"/>
  <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${size * 0.42}" font-weight="800" fill="${LOGO_NAVY}" filter="url(#mp-mark-depth)">m</text>
</svg>`;
}

export function myPicksLiveWordmarkDataUri(options?: WordmarkOptions): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveWordmarkSvg(options))}`;
}

export function myPicksLiveMarkDataUri(size = 512): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveMarkSvg(size))}`;
}
