import { ImageResponse } from "next/og";
import { myPicksLiveMarkDataUri } from "@/lib/brand/mypicks-live-wordmark-svg";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <img
        alt=""
        height={512}
        src={myPicksLiveMarkDataUri(512)}
        style={{ display: "block" }}
        width={512}
      />
    ),
    { ...size }
  );
}
