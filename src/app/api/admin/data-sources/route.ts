import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest, getAdminAuthStatus } from "@/lib/admin/auth";
import { buildAdminDataSources } from "@/lib/admin/data-sources";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!getAdminAuthStatus().configured) {
    return NextResponse.json(
      {
        error: "Admin data sources dashboard is not configured. Set ADMIN_DATA_SOURCES_TOKEN."
      },
      { status: 503 }
    );
  }

  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await buildAdminDataSources();

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
