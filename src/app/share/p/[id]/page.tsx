import type { Metadata } from "next";
import {
  SharePredictionUnavailable,
  SharePredictionView
} from "@/components/share-prediction-view";
import { buildPredictionShareCaption } from "@/lib/predictions/share";
import { resolvePredictionSharePayload } from "@/lib/predictions/share-resolve";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await resolvePredictionSharePayload(id);
  if (!payload) {
    return {
      title: "Kickboard prediction",
      description: "World Cup predictions on Kickboard."
    };
  }

  const caption = buildPredictionShareCaption(payload);
  return {
    title: `${payload.fixtureLabel} — Kickboard`,
    description: caption,
    openGraph: {
      title: `${payload.fixtureLabel} — Kickboard prediction`,
      description: caption,
      type: "website"
    }
  };
}

export default async function SharePredictionShortPage({ params }: PageProps) {
  const { id } = await params;
  const payload = await resolvePredictionSharePayload(id);

  if (!payload) {
    return <SharePredictionUnavailable />;
  }

  return <SharePredictionView payload={payload} />;
}
