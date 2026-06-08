import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getProfileDiscoverable,
  updateProfileDiscoverable
} from "@/lib/user/profile-visibility";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const profileDiscoverable = await getProfileDiscoverable(user.id);
    if (profileDiscoverable === null) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ profileDiscoverable });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load profile visibility." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json(
      { error: "Fan Mode accounts cannot change profile visibility." },
      { status: 403 }
    );
  }

  const body = (await request.json()) as { profileDiscoverable?: unknown };
  if (typeof body.profileDiscoverable !== "boolean") {
    return NextResponse.json({ error: "profileDiscoverable must be true or false." }, { status: 400 });
  }

  try {
    const profileDiscoverable = await updateProfileDiscoverable(user.id, body.profileDiscoverable);
    if (profileDiscoverable === null) {
      return NextResponse.json({ error: "Unable to update profile visibility." }, { status: 500 });
    }
    return NextResponse.json({ profileDiscoverable });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to update profile visibility." }, { status: 500 });
  }
}
