import { NextResponse } from "next/server";
import { reportPost } from "@/lib/community/posts";
import { getCommunitySessionUserId } from "@/lib/community/session";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

const REASONS = new Set(["spam", "harassment", "off_topic", "other"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ postId: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { postId } = await context.params;

  try {
    const payload = (await request.json()) as { reason?: string; details?: string };
    const reason = payload.reason ?? "other";
    if (!REASONS.has(reason)) {
      return NextResponse.json({ error: "Invalid report reason." }, { status: 400 });
    }

    const reporterId = await getCommunitySessionUserId();

    await reportPost(postId, reporterId, reason as "spam" | "harassment" | "off_topic" | "other", payload.details);

    return NextResponse.json({
      ok: true,
      message: "Report received. The post was hidden pending review."
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to submit report." }, { status: 500 });
  }
}
