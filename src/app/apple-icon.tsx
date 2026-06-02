import { ImageResponse } from "next/og";
import { KickboardIconMark } from "@/lib/brand/kickboard-icon-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<KickboardIconMark size={180} fontSize={42} />, { ...size });
}
