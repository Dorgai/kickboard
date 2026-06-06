import { NextResponse } from "next/server";
import { recordActivityEvent } from "@/lib/activity/store";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import { MATCH_LINEUP_SIZE } from "@/lib/squads/lineup";
import {
  createUserSquad,
  defaultLineupForFormations,
  getLatestUserSquad,
  listUserSquads,
  listUserSquadsForFixture,
  parseFormationsFromRequest,
  updateUserSquad,
  type SquadLineupSlot
} from "@/lib/squads/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const fixtureKey = new URL(request.url).searchParams.get("fixtureKey")?.trim() ?? "";
  const squads = fixtureKey
    ? await listUserSquadsForFixture(user.id, fixtureKey)
    : await listUserSquads(user.id);
  const latest = fixtureKey ? squads[0] ?? null : null;
  const latestFull =
    latest && fixtureKey ? await getLatestUserSquad(user.id, fixtureKey) : null;
  return NextResponse.json({
    squads,
    latest: latestFull,
    fixtureKey: fixtureKey || null
  });
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
      squadId?: string;
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

    const lineup =
      Array.isArray(body.lineup) &&
      (body.lineup.length === MATCH_LINEUP_SIZE || body.lineup.length === 11)
        ? body.lineup
        : defaultLineupForFormations(formations);

    const existingId = typeof body.squadId === "string" ? body.squadId.trim() : "";
    let squadId: string | null = null;
    let updatedExisting = Boolean(existingId);

    if (existingId) {
      squadId = await updateUserSquad({
        squadId: existingId,
        userId: user.id,
        name: body.name ?? "My XI",
        formations,
        lineup,
        fixtureKey
      });
      if (!squadId) {
        return NextResponse.json({ error: "Squad not found." }, { status: 404 });
      }
    } else {
      const existingForFixture = await getLatestUserSquad(user.id, fixtureKey);
      if (existingForFixture) {
        updatedExisting = true;
        squadId = await updateUserSquad({
          squadId: existingForFixture.id,
          userId: user.id,
          name: body.name ?? "My XI",
          formations,
          lineup,
          fixtureKey
        });
        if (!squadId) {
          return NextResponse.json({ error: "Squad not found." }, { status: 404 });
        }
      } else {
        squadId = await createUserSquad({
          userId: user.id,
          name: body.name ?? "My XI",
          formations,
          lineup,
          fixtureKey
        });
        if (!squadId) {
          return NextResponse.json({ error: "Unable to save squad." }, { status: 500 });
        }
      }
    }

    void recordActivityEvent({
      userId: user.id,
      eventType: "squad_saved",
      summary: updatedExisting ? "Updated Coach Board squad" : "Saved new Coach Board squad",
      metadata: { squadId, fixtureKey }
    }).catch(() => undefined);

    return NextResponse.json({
      squadId,
      message: updatedExisting
        ? "Squad updated. Publish when ready."
        : "Squad saved. Publish it to the Coach Board when ready."
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    if (error instanceof Error && error.message === "FIXTURE_KEY_REQUIRED") {
      return NextResponse.json({ error: "Select a match for this Coach Board." }, { status: 400 });
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
