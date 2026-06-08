import {
  LOGO_NAVY,
  LOGO_PAPER,
  WORDMARK_FONT,
  WORDMARK_LAYOUT
} from "@/lib/brand/logo-colors";

type WordmarkOptions = {
  showLive?: boolean;
  width?: number;
  height?: number;
};

function wordmarkTextNodes(showLive = true): string {
  const { mypicks, live } = WORDMARK_LAYOUT;
  const liveText = showLive
    ? `<text x="${live.x}" y="${live.y}" font-family="${WORDMARK_FONT}" font-size="${live.fontSize}" font-weight="${live.fontWeight}" letter-spacing="${live.letterSpacing}" fill="${LOGO_NAVY}">.live</text>`
    : "";

  return `<text x="${mypicks.x}" y="${mypicks.y}" font-family="${WORDMARK_FONT}" font-size="${mypicks.fontSize}" font-weight="${mypicks.fontWeight}" letter-spacing="${mypicks.letterSpacing}" fill="${LOGO_NAVY}">mypicks</text>
  ${liveText}`;
}

/** Horizontal lockup: bold mypicks + regular .live (text-only brand art). */
export function myPicksLiveWordmarkSvg({
  showLive = true,
  width = 320,
  height = 72
}: WordmarkOptions = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 72" width="${width}" height="${height}" role="img" aria-label="mypicks.live">
  ${wordmarkTextNodes(showLive)}
</svg>`;
}

/** Square app tile — paper squircle with centered text lockup (no icon graphic). */
export function myPicksLiveMarkSvg(size = 512): string {
  const scale = (size * 0.72) / 320;
  const lockupWidth = 320 * scale;
  const lockupHeight = 72 * scale;
  const offsetX = (size - lockupWidth) / 2;
  const offsetY = (size - lockupHeight) / 2;
  const radius = size * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="mypicks.live">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${LOGO_PAPER}"/>
  <g transform="translate(${offsetX} ${offsetY}) scale(${scale})">
    ${wordmarkTextNodes(true)}
  </g>
</svg>`;
}

export function myPicksLiveWordmarkDataUri(options?: WordmarkOptions): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveWordmarkSvg(options))}`;
}

export function myPicksLiveMarkDataUri(size = 512): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveMarkSvg(size))}`;
}
