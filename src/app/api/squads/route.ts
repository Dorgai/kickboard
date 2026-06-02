import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  createUserSquad,
  defaultLineupForFormation,
  isValidFormation,
  listUserSquads,
  type SquadLineupSlot
} from "@/lib/squads/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const squads = await listUserSquads(user.id);
  return NextResponse.json({ squads });
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      formation?: string;
      lineup?: SquadLineupSlot[];
    };

    const formation = body.formation ?? "4-3-3";
    if (!isValidFormation(formation)) {
      return NextResponse.json({ error: "Invalid formation." }, { status: 400 });
    }

    const lineup =
      Array.isArray(body.lineup) && body.lineup.length === 11
        ? body.lineup
        : defaultLineupForFormation(formation);

    const squadId = await createUserSquad({
      userId: user.id,
      name: body.name ?? "My XI",
      formation,
      lineup
    });

    if (!squadId) {
      return NextResponse.json({ error: "Unable to save squad." }, { status: 500 });
    }

    return NextResponse.json({ squadId, message: "Squad saved. Publish it to the Coach Board when ready." });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    if (error instanceof Error && error.message === "TOURNAMENT_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Run npm run db:schema (includes auth-extensions.sql) on this database." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Unable to save squad." }, { status: 500 });
  }
}
