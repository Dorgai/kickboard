import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { generateAiHelpReply } from "@/lib/help/ai";
import { mapDatabaseError } from "@/lib/community/health";
import {
  appendHelpMessage,
  appendHelpMessageToConversation,
  assertConversationOwnedByUser,
  getUserHelpConversation
} from "@/lib/help/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { conversationId } = await context.params;

  try {
    const body = (await request.json()) as { message?: string };
    const message = body.message?.trim() ?? "";
    if (!message) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }

    const channel = await assertConversationOwnedByUser(conversationId, user.id);

    await appendHelpMessage({
      conversationId,
      userId: user.id,
      role: "user",
      body: message,
      status: channel === "admin" ? "open" : undefined
    });

    if (channel === "ai") {
      const { reply, sources, usedLlm } = await generateAiHelpReply(message);
      await appendHelpMessageToConversation({
        conversationId,
        role: "assistant",
        body: reply,
        metadata: { sources, usedLlm },
        status: "answered"
      });
    }

    const conversation = await getUserHelpConversation(conversationId, user.id);
    return NextResponse.json({ conversation });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    if (error instanceof Error && error.message === "CONVERSATION_NOT_FOUND") {
      return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "MESSAGE_EMPTY") {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to send message." }, { status: 500 });
  }
}
