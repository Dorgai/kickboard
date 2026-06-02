import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { searchConnectableUsers } from "@/lib/connections/store";
import { mapDatabaseError } from "@/lib/community/health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot search users." }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

  try {
    const users = await searchConnectableUsers(user.id, q);
    return NextResponse.json({ users });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to search users." }, { status: 500 });
  }
}
