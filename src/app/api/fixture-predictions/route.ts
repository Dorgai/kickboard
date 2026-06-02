import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  getUserFixturePrediction,
  upsertUserFixturePrediction
} from "@/lib/fixture-predictions/store";

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
      homeScore?: number;
      awayScore?: number;
    };

    const id = await upsertUserFixturePrediction({
      userId: user.id,
      fixtureKey: body.fixtureKey ?? "",
      homeScore: Number(body.homeScore),
      awayScore: Number(body.awayScore)
    });

    if (!id) {
      return NextResponse.json({ error: "Unable to save prediction." }, { status: 500 });
    }

    const prediction = await getUserFixturePrediction(user.id, body.fixtureKey ?? "");
    return NextResponse.json({
      prediction,
      message: "Score pick saved. Connected friends can see it for this match."
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FIXTURE_KEY_REQUIRED") {
      return NextResponse.json({ error: "Select a match first." }, { status: 400 });
    }
    if (error instanceof Error && error.message === "INVALID_SCORE") {
      return NextResponse.json({ error: "Scores must be between 0 and 20." }, { status: 400 });
    }
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save prediction." }, { status: 500 });
  }
}
