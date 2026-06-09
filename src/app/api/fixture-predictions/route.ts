import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  deleteUserFixturePrediction,
  getUserFixturePrediction,
  upsertUserFixturePrediction
} from "@/lib/fixture-predictions/store";
import { getFixturePredictionLockState } from "@/lib/fixtures/prediction-window";
import { parseScorerPicks, type FixtureOutcome } from "@/lib/fixture-predictions/types";

export const dynamic = "force-dynamic";

function changeMessage(change: string) {
  if (change === "created") return "Picks saved for this match.";
  if (change === "updated") return "Picks updated for this match.";
  if (change === "deleted") return "Picks removed for this match.";
  return "No changes to your picks.";
}

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
    const [prediction, lockState] = await Promise.all([
      getUserFixturePrediction(user.id, fixtureKey),
      getFixturePredictionLockState(fixtureKey)
    ]);
    return NextResponse.json({ prediction, ...lockState });
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

    const { id, change } = await upsertUserFixturePrediction({
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
      change,
      message: changeMessage(change)
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
        { error: "Add at least one pick: who wins, final score, or who scores — or remove picks." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "TOO_MANY_SCORERS") {
      return NextResponse.json(
        { error: "You can pick up to 8 individual goals (same player allowed more than once)." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "TOO_MANY_SCORERS_FOR_SCORE") {
      return NextResponse.json(
        { error: "Who scores must match your final score — one pick per goal." },
        { status: 400 }
      );
    }
    if (
      error instanceof Error &&
      (error.message === "TOO_MANY_HOME_SCORERS" || error.message === "TOO_MANY_AWAY_SCORERS")
    ) {
      return NextResponse.json(
        { error: "Each team can only have as many scorer picks as goals in your scoreline." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "SCORERS_WITH_ZERO_SCORE") {
      return NextResponse.json(
        { error: "A 0–0 score cannot have goal scorers. Clear scorers or change the score." },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "PREDICTIONS_LOCKED") {
      return NextResponse.json(
        { error: "Picks are locked — this match has already kicked off." },
        { status: 403 }
      );
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save prediction." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

  const fixtureKey = new URL(request.url).searchParams.get("fixtureKey")?.trim() ?? "";
  if (!fixtureKey) {
    return NextResponse.json({ error: "fixtureKey is required." }, { status: 400 });
  }

  try {
    const { deleted, change } = await deleteUserFixturePrediction(user.id, fixtureKey);
    if (!deleted) {
      return NextResponse.json({ error: "No picks to remove for this match." }, { status: 404 });
    }
    return NextResponse.json({
      change,
      message: changeMessage(change)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FIXTURE_KEY_REQUIRED") {
      return NextResponse.json({ error: "Select a match first." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "PREDICTIONS_LOCKED") {
      return NextResponse.json(
        { error: "Picks are locked — this match has already kicked off." },
        { status: 403 }
      );
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to remove prediction." }, { status: 500 });
  }
}
