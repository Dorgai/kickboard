import { LOGO_LIVE, LOGO_NAVY } from "@/lib/brand/logo-colors";
import { BRAND } from "@/lib/brand";

type BrandWordmarkProps = {
  className?: string;
  /** Hide “.live” on very tight headers (mobile). */
  compact?: boolean;
  title?: string;
};

export function BrandWordmark({
  className,
  compact = false,
  title = BRAND.url.replace("https://", "")
}: BrandWordmarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className ?? "brand-wordmark"}
      role={title ? "img" : "presentation"}
      viewBox="0 0 320 72"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <filter height="150%" id="brand-wordmark-depth" width="116%" x="-8%" y="-20%">
          <feDropShadow
            dx="0"
            dy="2.5"
            floodColor="#0f172a"
            floodOpacity="0.22"
            stdDeviation="1.8"
          />
        </filter>
      </defs>
      <g filter="url(#brand-wordmark-depth)">
        <text
          fill={LOGO_NAVY}
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontSize="42"
          fontWeight="800"
          letterSpacing="-0.04em"
          x="2"
          y="44"
        >
          mypicks
        </text>
        {compact ? null : (
          <text
            fill={LOGO_LIVE}
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            fontSize="21"
            fontWeight="700"
            x="206"
            y="58"
          >
            .live
          </text>
        )}
      </g>
    </svg>
  );
}
