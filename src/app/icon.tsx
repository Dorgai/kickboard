import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "linear-gradient(145deg, #15803d 0%, #16a34a 45%, #22c55e 100%)",
          borderRadius: 96,
          color: "#fff",
          display: "flex",
          fontSize: 200,
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -8,
          width: "100%"
        }}
      >
        MP
      </div>
    ),
    { ...size }
  );
}
