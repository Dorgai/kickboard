import { ImageResponse } from "next/og";
import { KickboardIconMark } from "@/lib/brand/kickboard-icon-mark";

const ALLOWED = new Set([192, 512]);

export async function GET(
  _request: Request,
  context: { params: Promise<{ size: string }> }
) {
  const { size: sizeParam } = await context.params;
  const dimension = Number(sizeParam);
  if (!ALLOWED.has(dimension)) {
    return new Response("Not found", { status: 404 });
  }

  const fontSize = dimension >= 512 ? 120 : 46;

  return new ImageResponse(<KickboardIconMark size={dimension} fontSize={fontSize} />, {
    width: dimension,
    height: dimension
  });
}
