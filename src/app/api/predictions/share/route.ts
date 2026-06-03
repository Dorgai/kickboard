import { NextResponse } from "next/server";
import { payloadFromStored, savePredictionShareLink } from "@/lib/predictions/share-store";
import {
  buildPredictionSharePageUrl,
  buildPredictionSharePageUrlEmbedded,
  type PredictionSharePayload
} from "@/lib/predictions/share";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PredictionSharePayload;
    const payload = payloadFromStored(body);
    if (!payload) {
      return NextResponse.json({ error: "Invalid share payload." }, { status: 400 });
    }

    const shareId = await savePredictionShareLink(payload);
    if (!shareId) {
      const fallbackUrl = buildPredictionSharePageUrlEmbedded(payload);
      return NextResponse.json({
        shareId: null,
        url: fallbackUrl,
        mode: "embedded" as const
      });
    }

    return NextResponse.json({
      shareId,
      url: buildPredictionSharePageUrl(shareId),
      mode: "short" as const
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create share link.";
    if (message === "DATABASE_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Share links require the database. Try again after setup." },
        { status: 503 }
      );
    }
    console.error("[predictions/share]", error);
    return NextResponse.json({ error: "Unable to create share link." }, { status: 500 });
  }
}
