import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { MATCH_LINEUP_SIZE, SLOTS_PER_TEAM } from "@/lib/squads/lineup";
import {
  getUserSquadById,
  parseFormationsFromRequest,
  updateUserSquad,
  type SquadLineupSlot
} from "@/lib/squads/store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ squadId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { squadId } = await context.params;
  const squad = await getUserSquadById(squadId, user.id);
  if (!squad) {
    return NextResponse.json({ error: "Squad not found." }, { status: 404 });
  }

  return NextResponse.json({ squad });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const { squadId } = await context.params;

  try {
    const body = (await request.json()) as {
      fixtureKey?: string;
      name?: string;
      formation?: string | { home?: string; away?: string };
      homeFormation?: string;
      awayFormation?: string;
      lineup?: SquadLineupSlot[];
    };

    const fixtureKey = body.fixtureKey?.trim() ?? "";
    if (!fixtureKey) {
      return NextResponse.json({ error: "Select a match for this Coach Board." }, { status: 400 });
    }

    const formations = parseFormationsFromRequest(body);
    if (!formations) {
      return NextResponse.json({ error: "Invalid formation." }, { status: 400 });
    }

    if (
      !Array.isArray(body.lineup) ||
      (body.lineup.length !== MATCH_LINEUP_SIZE && body.lineup.length !== SLOTS_PER_TEAM)
    ) {
      return NextResponse.json(
        { error: `Lineup must include ${MATCH_LINEUP_SIZE} slots (home and away).` },
        { status: 400 }
      );
    }

    const updatedId = await updateUserSquad({
      squadId,
      userId: user.id,
      name: body.name ?? "My XI",
      formations,
      lineup: body.lineup,
      fixtureKey
    });

    if (!updatedId) {
      return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    }

    return NextResponse.json({
      squadId: updatedId,
      message: "Squad updated."
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    return NextResponse.json({ error: "Unable to update squad." }, { status: 500 });
  }
}
