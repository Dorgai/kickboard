import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import { mapDatabaseError } from "@/lib/community/health";
import { listAllHelpConversationsForAdmin, type HelpChannel } from "@/lib/help/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelParam = searchParams.get("channel")?.trim();
  const channel =
    channelParam === "ai" || channelParam === "admin" ? (channelParam as HelpChannel) : null;
  const limit = Number(searchParams.get("limit") ?? "100");

  try {
    const conversations = await listAllHelpConversationsForAdmin({ channel, limit });
    return NextResponse.json({ conversations });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load help conversations." }, { status: 500 });
  }
}
