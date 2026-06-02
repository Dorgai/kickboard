import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { buildAdminDataSources } from "@/lib/admin/data-sources";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await buildAdminDataSources();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
