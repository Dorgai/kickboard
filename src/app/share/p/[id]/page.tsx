import type { Metadata } from "next";
import {
  SharePredictionUnavailable,
  SharePredictionView
} from "@/components/share-prediction-view";
import { buildShareCaption, sharePayloadOpenGraphTitle, sharePayloadTitle } from "@/lib/predictions/share";
import { resolveSharePayload } from "@/lib/predictions/share-resolve";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const payload = await resolveSharePayload(id);
  if (!payload) {
    return {
      title: "MyPicks prediction",
      description: "World Cup predictions on MyPicks."
    };
  }

  const caption = buildShareCaption(payload);
  const title = sharePayloadTitle(payload);
  return {
    title,
    description: caption,
    openGraph: {
      title: sharePayloadOpenGraphTitle(payload),
      description: caption,
      type: "website"
    }
  };
}

export default async function SharePredictionShortPage({ params }: PageProps) {
  const { id } = await params;
  const payload = await resolveSharePayload(id);

  if (!payload) {
    return <SharePredictionUnavailable />;
  }

  return <SharePredictionView payload={payload} />;
}
