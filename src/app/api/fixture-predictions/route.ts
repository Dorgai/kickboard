import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getUserFixturePrediction,
  upsertUserFixturePrediction
} from "@/lib/fixture-predictions/store";
import { parseScorerPicks, type FixtureOutcome } from "@/lib/fixture-predictions/types";

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
  if (!fixtureKey) {
    return NextResponse.json({ error: "fixtureKey is required." }, { status: 400 });
  }

  try {
    const prediction = await getUserFixturePrediction(user.id, fixtureKey);
    return NextResponse.json({ prediction });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load prediction." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }
  if (user.isChild) {
    return NextResponse.json({ error: "Fan Mode accounts cannot place predictions." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      fixtureKey?: string;
      predictedOutcome?: FixtureOutcome | null;
      homeScore?: number | null;
      awayScore?: number | null;
      scorerPicks?: unknown;
    };

    const outcome =
      body.predictedOutcome === "home" ||
      body.predictedOutcome === "draw" ||
      body.predictedOutcome === "away"
        ? body.predictedOutcome
        : body.predictedOutcome === null
          ? null
          : undefined;

    const id = await upsertUserFixturePrediction({
      userId: user.id,
      fixtureKey: body.fixtureKey ?? "",
      predictedOutcome: outcome,
      homeScore: body.homeScore,
      awayScore: body.awayScore,
      scorerPicks: body.scorerPicks !== undefined ? parseScorerPicks(body.scorerPicks) : undefined
    });

    if (!id) {
      return NextResponse.json({ error: "Unable to save prediction." }, { status: 500 });
    }

    const prediction = await getUserFixturePrediction(user.id, body.fixtureKey ?? "");
    return NextResponse.json({
      prediction,
      message: "Predictions saved for this match."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FIXTURE_KEY_REQUIRED") {
      return NextResponse.json({ error: "Select a match first." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_SCORE") {
      return NextResponse.json({ error: "Enter both goal counts (0–20) or leave score empty." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PICK_REQUIRED") {
      return NextResponse.json(
        { error: "Add at least one: winner/draw, exact score, or goal scorers." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "TOO_MANY_SCORERS") {
      return NextResponse.json(
        { error: "You can pick up to 8 individual goals (same player allowed more than once)." },
        { status: 400 }
      );
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save prediction." }, { status: 500 });
  }
}
