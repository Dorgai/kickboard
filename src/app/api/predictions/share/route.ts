import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { payloadFromStored, savePredictionShareLink } from "@/lib/predictions/share-store";
import {
  buildPredictionSharePageUrl,
  buildPredictionSharePageUrlEmbedded,
  type PredictionSharePayload
} from "@/lib/predictions/share";

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return "code" in error && String(error.code) === "42P01";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PredictionSharePayload;
    const payload = payloadFromStored(body);
    if (!payload) {
      return NextResponse.json({ error: "Invalid share payload." }, { status: 400 });
    }

    const shareId = await savePredictionShareLink(payload);
    if (shareId) {
      return NextResponse.json({
        shareId,
        url: buildPredictionSharePageUrl(shareId),
        mode: "short" as const
      });
    }

    if (isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            "Short share links are not ready yet. Run npm run db:schema (or the Apply community schema workflow) so prediction_share_links exists."
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      shareId: null,
      url: buildPredictionSharePageUrlEmbedded(payload),
      mode: "embedded" as const
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create share link.";
    if (message === "DATABASE_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Share links require the database. Try again after setup." },
        { status: 503 }
      );
    }
    if (isMissingRelationError(error)) {
      return NextResponse.json(
        {
          error:
            "Share link storage is missing. Run npm run db:schema (prediction_share_links table)."
        },
        { status: 503 }
      );
    }
    console.error("[predictions/share]", error);
    return NextResponse.json({ error: "Unable to create share link." }, { status: 500 });
  }
}
