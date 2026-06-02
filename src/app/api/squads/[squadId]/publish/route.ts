import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { publishSquadToBoard } from "@/lib/squads/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ squadId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { squadId } = await context.params;

  try {
    const result = await publishSquadToBoard(squadId, user.id);
    return NextResponse.json({
      ...result,
      message: "Squad shared to Coach Board."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SQUAD_NOT_FOUND") {
      return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    return NextResponse.json({ error: "Unable to publish squad." }, { status: 500 });
  }
}
