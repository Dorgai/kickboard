import { WORDMARK_FONT, WORDMARK_LAYOUT, WORDMARK_VIEWBOX } from "@/lib/brand/logo-colors";
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
  const { mypicks, live } = WORDMARK_LAYOUT;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className ?? "brand-wordmark"}
      role={title ? "img" : "presentation"}
      viewBox={`0 0 ${WORDMARK_VIEWBOX.width} ${WORDMARK_VIEWBOX.height}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <text
        className="brand-wordmark__primary"
        fill="var(--brand-wordmark-primary)"
        fontFamily={WORDMARK_FONT}
        fontSize={mypicks.fontSize}
        fontWeight={mypicks.fontWeight}
        letterSpacing={mypicks.letterSpacing}
        x={mypicks.x}
        y={mypicks.y}
      >
        mypicks
      </text>
      {compact ? null : (
        <text
          className="brand-wordmark__live"
          fill="var(--brand-wordmark-live)"
          fontFamily={WORDMARK_FONT}
          fontSize={live.fontSize}
          fontWeight={live.fontWeight}
          letterSpacing={live.letterSpacing}
          textAnchor={live.textAnchor}
          x={live.x}
          y={live.y}
        >
          .live
        </text>
      )}
    </svg>
  );
}
