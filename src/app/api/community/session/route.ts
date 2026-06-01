import { NextResponse } from "next/server";
import {
  COMMUNITY_COOKIE,
  communitySessionCookieOptions,
  createCommunitySessionToken,
  getCommunitySessionUserId
} from "@/lib/community/session";
import { mapDatabaseError } from "@/lib/community/health";
import { findUserById, isChildAccount, registerCommunityUser } from "@/lib/community/users";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, user: null });
  }

  try {
    const userId = await getCommunitySessionUserId();
    if (!userId) {
      return NextResponse.json({ connected: true, user: null });
    }

    const user = await findUserById(userId);
    if (!user || user.is_suspended) {
      return NextResponse.json({ connected: true, user: null });
    }

    return NextResponse.json({
      connected: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name ?? user.username,
        isChild: user.is_child
      }
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    console.error(error);
    return NextResponse.json({ error: "Unable to load community session." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as { displayName?: string; birthYear?: number };
    const displayName = payload.displayName?.trim() ?? "";
    const birthYear = Number(payload.birthYear);

    if (!displayName) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    if (!Number.isInteger(birthYear)) {
      return NextResponse.json({ error: "Enter a valid birth year." }, { status: 400 });
    }

    if (isChildAccount(birthYear)) {
      return NextResponse.json(
        {
          error:
            "Accounts under 13 stay in Fan Mode without public posting. Browse match data and live scores instead."
        },
        { status: 403 }
      );
    }

    const user = await registerCommunityUser(displayName, birthYear);
    const token = createCommunitySessionToken(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name ?? user.username,
        isChild: false
      }
    });

    response.cookies.set(COMMUNITY_COOKIE, token, communitySessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_DISPLAY_NAME") {
        return NextResponse.json({ error: "Display name must be 2–60 characters." }, { status: 400 });
      }
      if (error.message === "INVALID_BIRTH_YEAR") {
        return NextResponse.json({ error: "Enter a valid birth year." }, { status: 400 });
      }
      if (error.message === "CHILD_ACCOUNT_BLOCKED") {
        return NextResponse.json(
          { error: "Accounts under 13 cannot post on the Coach Board." },
          { status: 403 }
        );
      }
      if (error.message === "USER_INSERT_FAILED") {
        return NextResponse.json(
          { error: "Account could not be saved. Check admin Coach Board setup." },
          { status: 500 }
        );
      }
      if (error.message === "JWT_SECRET_NOT_CONFIGURED") {
        return NextResponse.json({ error: "JWT_SECRET is not configured." }, { status: 503 });
      }
    }

    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });

    console.error("community session POST failed", error);
    return NextResponse.json({ error: "Unable to create community session." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COMMUNITY_COOKIE, "", { ...communitySessionCookieOptions(), maxAge: 0 });
  return response;
}
