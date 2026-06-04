import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  deleteUserTournamentPrediction,
  getUserTournamentPrediction,
  upsertUserTournamentPrediction
} from "@/lib/tournament-predictions/store";
import {
  DEFAULT_TOURNAMENT_KEY,
  normalizeTournamentTeam,
  parsePredictedFinalists,
  parseTournamentPlayerPick
} from "@/lib/tournament-predictions/types";

export const dynamic = "force-dynamic";

function changeMessage(change: string) {
  if (change === "created") return "Tournament picks saved.";
  if (change === "updated") return "Tournament picks updated.";
  if (change === "deleted") return "Tournament picks removed.";
  return "No changes to your tournament picks.";
}

export async function GET(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!user.onboardingComplete) {
    return NextResponse.json({ error: "Complete onboarding first." }, { status: 403 });
  }

  const tournamentKey =
    new URL(request.url).searchParams.get("tournamentKey")?.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;

  try {
    const prediction = await getUserTournamentPrediction(user.id, tournamentKey);
    return NextResponse.json({ prediction });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load tournament picks." }, { status: 500 });
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
      tournamentKey?: string;
      predictedChampion?: string | null;
      predictedFinalists?: unknown;
      predictedTopScorer?: unknown;
      predictedBestPlayer?: unknown;
    };

    const championProvided = Object.prototype.hasOwnProperty.call(body, "predictedChampion");
    const finalistsProvided = Object.prototype.hasOwnProperty.call(body, "predictedFinalists");
    const topScorerProvided = Object.prototype.hasOwnProperty.call(body, "predictedTopScorer");
    const bestPlayerProvided = Object.prototype.hasOwnProperty.call(body, "predictedBestPlayer");

    const { id, change } = await upsertUserTournamentPrediction({
      userId: user.id,
      tournamentKey: body.tournamentKey,
      predictedChampion: championProvided
        ? normalizeTournamentTeam(body.predictedChampion)
        : undefined,
      predictedFinalists: finalistsProvided
        ? parsePredictedFinalists(body.predictedFinalists)
        : undefined,
      predictedTopScorer: topScorerProvided
        ? parseTournamentPlayerPick(body.predictedTopScorer)
        : undefined,
      predictedBestPlayer: bestPlayerProvided
        ? parseTournamentPlayerPick(body.predictedBestPlayer)
        : undefined
    });

    const tournamentKey = body.tournamentKey?.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;
    const prediction = id ? await getUserTournamentPrediction(user.id, tournamentKey) : null;

    return NextResponse.json({
      prediction,
      change,
      message: changeMessage(change)
    });
  } catch (error) {
    if (error instanceof Error && error.message === "PICK_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "Add at least one tournament pick: champion, finalists, top scorer, or best player — or remove all picks."
        },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message === "DUPLICATE_FINALISTS") {
      return NextResponse.json({ error: "Pick two different finalists." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "TOO_MANY_FINALISTS") {
      return NextResponse.json({ error: "You can pick at most two finalists." }, { status: 400 });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save tournament picks." }, { status: 500 });
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

  const tournamentKey =
    new URL(request.url).searchParams.get("tournamentKey")?.trim().slice(0, 20) || DEFAULT_TOURNAMENT_KEY;

  try {
    const { deleted, change } = await deleteUserTournamentPrediction(user.id, tournamentKey);
    if (!deleted) {
      return NextResponse.json({ error: "No tournament picks to remove." }, { status: 404 });
    }
    return NextResponse.json({ change, message: changeMessage(change) });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to remove tournament picks." }, { status: 500 });
  }
}
