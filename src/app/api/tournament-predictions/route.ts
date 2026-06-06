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
  normalizeTournamentTopScorerBoard,
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
      predictedTopScorerBoard?: unknown;
      predictedBestPlayer?: unknown;
    };

    const championProvided = Object.prototype.hasOwnProperty.call(body, "predictedChampion");
    const finalistsProvided = Object.prototype.hasOwnProperty.call(body, "predictedFinalists");
    const topScorerProvided = Object.prototype.hasOwnProperty.call(body, "predictedTopScorer");
    const topScorerBoardProvided = Object.prototype.hasOwnProperty.call(body, "predictedTopScorerBoard");
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
      predictedTopScorerBoard: topScorerBoardProvided
        ? normalizeTournamentTopScorerBoard(body.predictedTopScorerBoard)
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
            "Add at least one tournament pick: champion, finalists, top scorer, scorer leaderboard, or best player — or remove all picks."
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
    if (error instanceof Error && error.message === "INVALID_SCORER_BOARD_SIZE") {
      return NextResponse.json({ error: "Scorer leaderboard size must be top 5 or top 10." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "TOO_MANY_SCORER_BOARD_PICKS") {
      return NextResponse.json({ error: "Too many players on the scorer leaderboard." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DUPLICATE_SCORER_BOARD_PLAYERS") {
      return NextResponse.json({ error: "Each player can only appear once on the scorer leaderboard." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "DUPLICATE_SCORER_BOARD_RANKS") {
      return NextResponse.json({ error: "Each rank on the scorer leaderboard must be unique." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_SCORER_BOARD_RANK") {
      return NextResponse.json({ error: "Scorer leaderboard ranks must stay within your top 5 or top 10." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_SCORER_BOARD_GOALS") {
      return NextResponse.json(
        { error: "Predicted goals must be between 1 and 30 for each scorer." },
        { status: 400 }
      );
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
