import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import { mapDatabaseError } from "@/lib/community/health";
import { getHelpConversationDetail } from "@/lib/help/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;

  try {
    const conversation = await getHelpConversationDetail(conversationId);
    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load conversation." }, { status: 500 });
  }
}
