import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { saveShareLink, sharePayloadFromStored } from "@/lib/predictions/share-store";
import {
  buildPredictionSharePageUrl,
  buildSharePageUrlEmbedded,
  canSharePayload,
  type SharePayload
} from "@/lib/predictions/share";

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  return "code" in error && String(error.code) === "42P01";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SharePayload;
    const payload = sharePayloadFromStored(body);
    if (!payload || !canSharePayload(payload)) {
      return NextResponse.json({ error: "Invalid share payload." }, { status: 400 });
    }

    const shareId = await saveShareLink(payload);
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
          error: "Share links are not available right now. Please try again in a moment."
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      shareId: null,
      url: buildSharePageUrlEmbedded(payload),
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
        { error: "Share links are not available right now. Please try again in a moment." },
        { status: 503 }
      );
    }
    console.error("[predictions/share]", error);
    return NextResponse.json({ error: "Unable to create share link." }, { status: 500 });
  }
}
