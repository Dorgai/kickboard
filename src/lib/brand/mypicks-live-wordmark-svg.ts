import {
  LOGO_INK_DARK,
  LOGO_NAVY,
  LOGO_PAPER,
  WORDMARK_FONT,
  WORDMARK_LAYOUT,
  WORDMARK_VIEWBOX
} from "@/lib/brand/logo-colors";

type WordmarkOptions = {
  showLive?: boolean;
  width?: number;
  height?: number;
  /** Light (default) or dark ink for raster/OG exports. */
  theme?: "light" | "dark";
};

function wordmarkInk(theme: "light" | "dark") {
  return theme === "dark" ? LOGO_INK_DARK : LOGO_NAVY;
}

function wordmarkTextNodes(showLive = true, theme: "light" | "dark" = "light"): string {
  const { mypicks, live } = WORDMARK_LAYOUT;
  const ink = wordmarkInk(theme);
  const liveText = showLive
    ? `<text x="${live.x}" y="${live.y}" text-anchor="${live.textAnchor}" font-family="${WORDMARK_FONT}" font-size="${live.fontSize}" font-weight="${live.fontWeight}" letter-spacing="${live.letterSpacing}" fill="${ink}" opacity="0.92">.live</text>`
    : "";

  return `<text x="${mypicks.x}" y="${mypicks.y}" font-family="${WORDMARK_FONT}" font-size="${mypicks.fontSize}" font-weight="${mypicks.fontWeight}" letter-spacing="${mypicks.letterSpacing}" fill="${ink}">mypicks</text>
  ${liveText}`;
}

/** Horizontal lockup: bold mypicks + regular .live (text-only brand art). */
export function myPicksLiveWordmarkSvg({
  showLive = true,
  width = WORDMARK_VIEWBOX.width,
  height = WORDMARK_VIEWBOX.height,
  theme = "light"
}: WordmarkOptions = {}): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}" width="${width}" height="${height}" role="img" aria-label="mypicks.live">
  ${wordmarkTextNodes(showLive, theme)}
</svg>`;
}

/** Square app tile — paper squircle with centered text lockup (no icon graphic). */
export function myPicksLiveMarkSvg(size = 512): string {
  const scale = (size * 0.72) / WORDMARK_VIEWBOX.width;
  const lockupWidth = WORDMARK_VIEWBOX.width * scale;
  const lockupHeight = WORDMARK_VIEWBOX.height * scale;
  const offsetX = (size - lockupWidth) / 2;
  const offsetY = (size - lockupHeight) / 2;
  const radius = size * 0.18;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="mypicks.live">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${LOGO_PAPER}"/>
  <g transform="translate(${offsetX} ${offsetY}) scale(${scale})">
    ${wordmarkTextNodes(true, "light")}
  </g>
</svg>`;
}

export function myPicksLiveWordmarkDataUri(options?: WordmarkOptions): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveWordmarkSvg(options))}`;
}

export function myPicksLiveMarkDataUri(size = 512): string {
  return `data:image/svg+xml,${encodeURIComponent(myPicksLiveMarkSvg(size))}`;
}
