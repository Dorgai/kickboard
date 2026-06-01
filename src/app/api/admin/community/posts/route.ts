import { NextResponse } from "next/server";
import { readAdminToken } from "@/lib/admin/auth";
import { listPostsForModeration, setPostModerationStatus } from "@/lib/community/posts";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const configured = process.env.ADMIN_DATA_SOURCES_TOKEN?.trim();
  if (!configured) return false;

  const token = readAdminToken({
    authorization: request.headers.get("authorization"),
    cookieToken: null,
    headerToken: request.headers.get("x-admin-token"),
    queryToken: new URL(request.url).searchParams.get("token")
  });

  return Boolean(token && token === configured);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  try {
    const posts = await listPostsForModeration();
    return NextResponse.json({ connected: true, posts });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load moderation queue." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as { postId?: string; action?: string };
    const postId = payload.postId;
    const action = payload.action;

    if (!postId) {
      return NextResponse.json({ error: "postId is required." }, { status: 400 });
    }

    if (action === "approve") {
      await setPostModerationStatus(postId, "approved");
      return NextResponse.json({ ok: true, moderationStatus: "approved" });
    }

    if (action === "remove" || action === "withhold") {
      const status = action === "remove" ? "removed" : "withheld";
      await setPostModerationStatus(postId, status);
      return NextResponse.json({ ok: true, moderationStatus: status });
    }

    return NextResponse.json({ error: "action must be approve, withhold, or remove." }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "POST_NOT_FOUND") {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to update post." }, { status: 500 });
  }
}
