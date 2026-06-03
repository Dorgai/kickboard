/** Shared mark for favicon / PWA icon generation (next/og ImageResponse). */
export function KickboardIconMark({
  size,
  fontSize
}: {
  size: number;
  fontSize: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #1A56DB 0%, #0e3a8a 55%, #06b6d4 100%)",
        borderRadius: size * 0.22,
        boxShadow: "0 8px 24px rgba(26, 86, 219, 0.45)"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: size * 0.02
        }}
      >
        <div
          style={{
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: "50%",
            border: `${Math.max(2, size * 0.04)}px solid rgba(255,255,255,0.92)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: size * 0.12,
              height: size * 0.12,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.95)"
            }}
          />
        </div>
        <span
          style={{
            color: "white",
            fontSize,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            fontFamily: "system-ui, sans-serif",
            lineHeight: 1
          }}
        >
          KB
        </span>
      </div>
    </div>
  );
}
