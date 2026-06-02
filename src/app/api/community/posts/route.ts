import { NextResponse } from "next/server";
import { recordActivityEvent } from "@/lib/activity/store";
import { mapDatabaseError } from "@/lib/community/health";
import { createTextPost, listApprovedPosts } from "@/lib/community/posts";
import { requireAuthUser } from "@/lib/auth/require-user";
import { getCommunitySessionUserId } from "@/lib/community/session";
import { findUserById } from "@/lib/community/users";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, posts: [] });
  }

  const fixtureKey = new URL(request.url).searchParams.get("fixtureKey")?.trim() ?? null;

  try {
    const posts = await listApprovedPosts(40, fixtureKey);
    return NextResponse.json({ connected: true, posts, fixtureKey });
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
    const authUser = await requireAuthUser();
    const legacyUserId = authUser?.id ?? (await getCommunitySessionUserId());
    if (!legacyUserId) {
      return NextResponse.json({ error: "Sign in with Google to post." }, { status: 401 });
    }

    if (authUser && !authUser.onboardingComplete) {
      return NextResponse.json({ error: "Complete onboarding (birth year) first." }, { status: 403 });
    }

    const user = await findUserById(legacyUserId);
    if (!user || user.is_suspended || user.is_banned) {
      return NextResponse.json({ error: "Account cannot post." }, { status: 403 });
    }

    if (user.is_child) {
      return NextResponse.json({ error: "Fan Mode accounts cannot post publicly." }, { status: 403 });
    }

    const payload = (await request.json()) as { body?: string };
    const body = payload.body ?? "";

    const post = await createTextPost(legacyUserId, body);

    void recordActivityEvent({
      userId: legacyUserId,
      eventType: "post_created",
      summary: `Posted on Coach Board: ${body.trim().slice(0, 80)}`,
      metadata: { postId: post.id }
    }).catch(() => undefined);

    return NextResponse.json({
      ok: true,
      postId: post.id,
      message: "Post published on the Coach Board."
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
