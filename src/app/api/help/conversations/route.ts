import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { generateAiHelpReply } from "@/lib/help/ai";
import { mapDatabaseError } from "@/lib/community/health";
import {
  appendHelpMessageToConversation,
  createHelpConversation,
  getUserHelpConversation,
  listUserHelpConversations,
  type HelpChannel
} from "@/lib/help/store";

export const dynamic = "force-dynamic";

function parseChannel(value: unknown): HelpChannel | null {
  if (value === "ai" || value === "admin") return value;
  return null;
}

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const conversations = await listUserHelpConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load help conversations." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      channel?: string;
      message?: string;
      subject?: string;
    };

    const channel = parseChannel(body.channel);
    const message = body.message?.trim() ?? "";
    if (!channel) {
      return NextResponse.json({ error: "channel must be ai or admin." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }

    const conversationId = await createHelpConversation({
      userId: user.id,
      channel,
      subject: body.subject,
      initialMessage: message,
      initialRole: "user"
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
    } else {
      await appendHelpMessageToConversation({
        conversationId,
        role: "system",
        body: "Thanks — an admin will review this thread. You can add more details here anytime.",
        metadata: {}
      });
    }

    const detail = await getUserHelpConversation(conversationId, user.id);

    return NextResponse.json({ conversation: detail });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    if (error instanceof Error && error.message === "MESSAGE_EMPTY") {
      return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to start conversation." }, { status: 500 });
  }
}
