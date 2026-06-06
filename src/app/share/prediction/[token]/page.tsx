import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  SharePredictionUnavailable,
  SharePredictionView
} from "@/components/share-prediction-view";
import { buildPredictionShareCaption } from "@/lib/predictions/share";
import { isShortShareId } from "@/lib/predictions/share-store";
import { resolvePredictionSharePayload } from "@/lib/predictions/share-resolve";
import { normalizePredictionShareToken } from "@/lib/predictions/share";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: raw } = await params;
  const payload = await resolvePredictionSharePayload(raw);
  if (!payload) {
    return {
      title: "MyPicks prediction",
      description: "World Cup predictions on MyPicks."
    };
  }

  const caption = buildPredictionShareCaption(payload);
  return {
    title: `${payload.fixtureLabel} — MyPicks`,
    description: caption,
    openGraph: {
      title: `${payload.fixtureLabel} — MyPicks prediction`,
      description: caption,
      type: "website"
    }
  };
}

export default async function SharePredictionTokenPage({ params }: PageProps) {
  const { token: raw } = await params;
  const token = normalizePredictionShareToken(raw);

  if (isShortShareId(token)) {
    redirect(`/share/p/${encodeURIComponent(token)}`);
  }

  const payload = await resolvePredictionSharePayload(token);

  if (!payload) {
    return <SharePredictionUnavailable />;
  }

  return <SharePredictionView payload={payload} />;
}
