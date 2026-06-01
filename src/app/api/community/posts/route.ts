import { NextResponse } from "next/server";
import { mapDatabaseError } from "@/lib/community/health";
import { createTextPost, listApprovedPosts } from "@/lib/community/posts";
import { getCommunitySessionUserId } from "@/lib/community/session";
import { findUserById } from "@/lib/community/users";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  try {
    const posts = await listApprovedPosts();
    return NextResponse.json({ connected: true, posts });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    console.error(error);
    return NextResponse.json({ error: "Unable to load community posts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const userId = await getCommunitySessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Sign in to the community first." }, { status: 401 });
    }

    const user = await findUserById(userId);
    if (!user || user.is_suspended) {
      return NextResponse.json({ error: "Account cannot post." }, { status: 403 });
    }

    if (user.is_child) {
      return NextResponse.json({ error: "Fan Mode accounts cannot post publicly." }, { status: 403 });
    }

    const payload = (await request.json()) as { body?: string };
    const body = payload.body ?? "";

    const post = await createTextPost(userId, body);

    return NextResponse.json({
      ok: true,
      postId: post.id,
      message: "Post submitted for moderation. It will appear on the Coach Board after review."
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "EMPTY_BODY") {
        return NextResponse.json({ error: "Write something before posting." }, { status: 400 });
      }
      if (error.message === "BODY_TOO_LONG") {
        return NextResponse.json({ error: "Posts are limited to 280 characters." }, { status: 400 });
      }
    }

    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });

    console.error(error);
    return NextResponse.json({ error: "Unable to create post." }, { status: 500 });
  }
}
