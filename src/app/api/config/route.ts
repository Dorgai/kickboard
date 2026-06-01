import { NextResponse } from "next/server";
import { getConfigReadiness } from "@/lib/kickboard-data";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      required: getConfigReadiness()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
