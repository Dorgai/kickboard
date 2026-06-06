import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  SharePredictionUnavailable,
  SharePredictionView
} from "@/components/share-prediction-view";
import { buildShareCaption, sharePayloadOpenGraphTitle, sharePayloadTitle } from "@/lib/predictions/share";
import { isShortShareId } from "@/lib/predictions/share-store";
import { resolveSharePayload } from "@/lib/predictions/share-resolve";
import { normalizePredictionShareToken } from "@/lib/predictions/share";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token: raw } = await params;
  const payload = await resolveSharePayload(raw);
  if (!payload) {
    return {
      title: "MyPicks prediction",
      description: "World Cup predictions on MyPicks."
    };
  }

  const caption = buildShareCaption(payload);
  return {
    title: sharePayloadTitle(payload),
    description: caption,
    openGraph: {
      title: sharePayloadOpenGraphTitle(payload),
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

  const payload = await resolveSharePayload(token);

  if (!payload) {
    return <SharePredictionUnavailable />;
  }

  return <SharePredictionView payload={payload} />;
}
