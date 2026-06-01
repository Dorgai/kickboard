import { NextResponse } from "next/server";
import { demoData } from "@/lib/demo-data";

export function GET() {
  return NextResponse.json(
    {
      ...demoData,
      generatedAt: new Date().toISOString()
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60"
      }
    }
  );
}
