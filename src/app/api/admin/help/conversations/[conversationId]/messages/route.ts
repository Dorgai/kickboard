import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import { mapDatabaseError } from "@/lib/community/health";
import { appendHelpMessageAsAdmin, getHelpConversationDetail } from "@/lib/help/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdminAuth(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await context.params;

  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim() ?? "";
    if (!message) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }

    const session = await auth();
    const adminUserId = session?.user?.id ?? "operator";

    await appendHelpMessageAsAdmin({
      conversationId,
      body: message,
      adminUserId
    });

    const conversation = await getHelpConversationDetail(conversationId);
    return NextResponse.json({ conversation });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    if (error instanceof Error && error.message === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Unable to send reply." }, { status: 500 });
  }
}
