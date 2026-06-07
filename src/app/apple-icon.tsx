import { ImageResponse } from "next/og";
import { myPicksMarkDataUri } from "@/lib/brand/mypicks-mark-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <img
        alt=""
        height={180}
        src={myPicksMarkDataUri(180)}
        style={{ display: "block" }}
        width={180}
      />
    ),
    { ...size }
  );
}
