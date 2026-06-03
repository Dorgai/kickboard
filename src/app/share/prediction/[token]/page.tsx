import type { Metadata } from "next";
import {
  SharePredictionUnavailable,
  SharePredictionView
} from "@/components/share-prediction-view";
import {
  buildPredictionShareCaption,
  decodePredictionShare,
  normalizePredictionShareToken
} from "@/lib/predictions/share";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: raw } = await params;
  const payload = decodePredictionShare(normalizePredictionShareToken(raw));
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

export default async function SharePredictionTokenPage({ params }: PageProps) {
  const { token: raw } = await params;
  const payload = decodePredictionShare(normalizePredictionShareToken(raw));

  if (!payload) {
    return <SharePredictionUnavailable />;
  }

  return <SharePredictionView payload={payload} />;
}
