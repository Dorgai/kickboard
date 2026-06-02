import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import {
  deleteFanChatMessageForAdmin,
  listFanChatMessagesForAdmin,
  sendAdminDirectMessage
} from "@/lib/admin/fan-chat";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, messages: [] });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId")?.trim() ?? null;
  const limit = Number(searchParams.get("limit") ?? "60");

  try {
    const messages = await listFanChatMessagesForAdmin(limit, userId);
    return NextResponse.json({ connected: true, messages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load Fan Chat messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as {
      recipientUserId?: string;
      body?: string;
      messageId?: string;
      action?: string;
    };

    if (payload.action === "delete") {
      const messageId = payload.messageId?.trim();
      if (!messageId) {
        return NextResponse.json({ error: "messageId is required." }, { status: 400 });
      }
      await deleteFanChatMessageForAdmin(messageId);
      return NextResponse.json({ ok: true });
    }

    const recipientUserId = payload.recipientUserId?.trim();
    const body = payload.body ?? "";
    if (!recipientUserId) {
      return NextResponse.json({ error: "recipientUserId is required." }, { status: 400 });
    }

    const result = await sendAdminDirectMessage(recipientUserId, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MESSAGE_EMPTY") {
        return NextResponse.json({ error: "Enter a message." }, { status: 400 });
      }
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (error.message === "MESSAGE_NOT_FOUND") {
        return NextResponse.json({ error: "Message not found." }, { status: 404 });
      }
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to update Fan Chat." }, { status: 500 });
  }
}
