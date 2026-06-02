import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin/require-admin";
import {
  getUserForAdmin,
  searchUsersForAdmin,
  setUserBanned,
  setUserSuspended
} from "@/lib/admin/users";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ connected: false, users: [] });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";

  try {
    if (userId) {
      const user = await getUserForAdmin(userId);
      if (!user) {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      return NextResponse.json({ connected: true, user });
    }

    const users = await searchUsersForAdmin(q);
    return NextResponse.json({ connected: true, users });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminAuth(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  try {
    const payload = (await request.json()) as {
      userId?: string;
      action?: string;
      suspendedUntil?: string | null;
    };

    const userId = payload.userId?.trim();
    const action = payload.action?.trim();

    if (!userId) {
      return NextResponse.json({ error: "userId is required." }, { status: 400 });
    }

    switch (action) {
      case "suspend":
        await setUserSuspended(userId, true, payload.suspendedUntil ?? null);
        break;
      case "unsuspend":
        await setUserSuspended(userId, false);
        break;
      case "ban":
        await setUserBanned(userId, true);
        break;
      case "unban":
        await setUserBanned(userId, false);
        break;
      default:
        return NextResponse.json(
          { error: "action must be suspend, unsuspend, ban, or unban." },
          { status: 400 }
        );
    }

    const user = await getUserForAdmin(userId);
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }
      if (error.message === "INVALID_SUSPENDED_UNTIL") {
        return NextResponse.json({ error: "Invalid suspendedUntil date." }, { status: 400 });
      }
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}
