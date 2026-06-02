import { ImageResponse } from "next/og";
import { KickboardIconMark } from "@/lib/brand/kickboard-icon-mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<KickboardIconMark size={32} fontSize={9} />, { ...size });
}
