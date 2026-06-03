import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SharePredictionUnavailable } from "@/components/share-prediction-view";
import {
  buildPredictionShareCaption,
  decodePredictionShare,
  readShareTokenFromSearchParams
} from "@/lib/predictions/share";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const token = readShareTokenFromSearchParams(params);
  const payload = token ? decodePredictionShare(token) : null;
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

/** Legacy `?d=` links — redirect to path-based URL when possible. */
export default async function SharePredictionLegacyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = readShareTokenFromSearchParams(params);

  if (token) {
    const payload = decodePredictionShare(token);
    if (payload) {
      redirect(`/share/prediction/${token}`);
    }
  }

  return <SharePredictionUnavailable />;
}
