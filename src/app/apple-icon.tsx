import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #15803d 0%, #16a34a 45%, #22c55e 100%)",
          borderRadius: 36,
          color: "#fff",
          display: "flex",
          fontSize: 72,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -3,
          width: "100%"
        }}
      >
        MP
      </div>
    ),
    { ...size }
  );
}
