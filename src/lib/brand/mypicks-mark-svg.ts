import { BRAND_GRADIENT, BRAND_LIVE } from "@/lib/brand/colors";

/** App icon / favicon mark (square, maskable-safe). */
export function myPicksMarkSvg(size = 512): string {
  const radius = Math.round(size * 0.21875);
  const { start, mid, end } = BRAND_GRADIENT;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" fill="none" role="img" aria-label="MyPicks Live">
  <defs>
    <linearGradient id="mp-bg" x1="8%" y1="6%" x2="92%" y2="94%">
      <stop offset="0%" stop-color="${start}"/>
      <stop offset="48%" stop-color="${mid}"/>
      <stop offset="100%" stop-color="${end}"/>
    </linearGradient>
    <linearGradient id="mp-shine" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#mp-bg)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#mp-shine)"/>
  <path d="M ${size * 0.23} ${size * 0.7} V ${size * 0.3} L ${size * 0.42} ${size * 0.53} L ${size * 0.58} ${size * 0.3} V ${size * 0.7}"
        stroke="#ffffff" stroke-width="${size * 0.1}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M ${size * 0.62} ${size * 0.7} L ${size * 0.7} ${size * 0.78} L ${size * 0.84} ${size * 0.58}"
        stroke="#ffffff" stroke-width="${size * 0.07}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92"/>
  <circle cx="${size * 0.74}" cy="${size * 0.27}" r="${size * 0.055}" fill="${BRAND_LIVE}"/>
  <circle cx="${size * 0.74}" cy="${size * 0.27}" r="${size * 0.078}" fill="none" stroke="#ffffff" stroke-width="${size * 0.014}" opacity="0.95"/>
</svg>`;
}

/** Horizontal lockup for marketing surfaces (optional static asset). */
export function myPicksWordmarkSvg(width = 640, height = 128): string {
  const markSize = height;
  const mark = myPicksMarkSvg(markSize);
  const textX = markSize + height * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-label="MyPicks Live">
  <foreignObject x="0" y="0" width="${markSize}" height="${markSize}">
    ${mark}
  </foreignObject>
  <text x="${textX}" y="${height * 0.62}" fill="#111827" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${height * 0.42}" font-weight="800" letter-spacing="0.06em">MYPICKS</text>
  <rect x="${textX + height * 2.05}" y="${height * 0.34}" width="${height * 0.72}" height="${height * 0.32}" rx="${height * 0.16}" fill="${BRAND_LIVE}"/>
  <text x="${textX + height * 2.17}" y="${height * 0.56}" fill="#ffffff" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${height * 0.17}" font-weight="800" letter-spacing="0.14em">LIVE</text>
</svg>`;
}

export function myPicksMarkDataUri(size = 512): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksMarkSvg(size))}`;
}
