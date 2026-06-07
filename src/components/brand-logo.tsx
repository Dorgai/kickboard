import { BRAND } from "@/lib/brand";
import { BRAND_LIVE } from "@/lib/brand/colors";

type BrandMarkProps = {
  size?: number;
  className?: string;
  title?: string;
};

/** Square app mark — header, dialogs, install prompts. */
export function BrandMark({ size = 40, className, title = `${BRAND.name} Live` }: BrandMarkProps) {
  const stroke = size * 0.1;
  const tickStroke = size * 0.07;
  const liveR = size * 0.055;
  const liveRingR = size * 0.078;
  const liveRingStroke = Math.max(1, size * 0.014);
  const radius = size * 0.22;

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      height={size}
      role={title ? "img" : "presentation"}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="brand-mark-bg" x1="8%" x2="92%" y1="6%" y2="94%">
          <stop offset="0%" stopColor="#15803d" />
          <stop offset="48%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
        <linearGradient id="brand-mark-shine" x1="50%" x2="50%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect fill="url(#brand-mark-bg)" height={size} rx={radius} width={size} />
      <rect fill="url(#brand-mark-shine)" height={size} rx={radius} width={size} />
      <path
        d={`M ${size * 0.23} ${size * 0.7} V ${size * 0.3} L ${size * 0.42} ${size * 0.53} L ${size * 0.58} ${size * 0.3} V ${size * 0.7}`}
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={stroke}
      />
      <path
        d={`M ${size * 0.62} ${size * 0.7} L ${size * 0.7} ${size * 0.78} L ${size * 0.84} ${size * 0.58}`}
        fill="none"
        opacity={0.92}
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={tickStroke}
      />
      <circle cx={size * 0.74} cy={size * 0.27} fill={BRAND_LIVE} r={liveR} />
      <circle
        cx={size * 0.74}
        cy={size * 0.27}
        fill="none"
        opacity={0.95}
        r={liveRingR}
        stroke="#ffffff"
        strokeWidth={liveRingStroke}
      />
    </svg>
  );
}

type BrandLogoProps = {
  showLive?: boolean;
  markSize?: number;
  className?: string;
};

/** Header lockup: mark + wordmark (+ optional LIVE pill). */
export function BrandLogo({ showLive = true, markSize = 40, className }: BrandLogoProps) {
  return (
    <span className={className ?? "brand-logo"}>
      <BrandMark className="brand-mark" size={markSize} />
      <span className="brand-wordmark">{BRAND.wordmark}</span>
      {showLive ? <span className="brand-live">LIVE</span> : null}
    </span>
  );
}
