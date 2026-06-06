import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SharePredictionUnavailable } from "@/components/share-prediction-view";
import {
  buildPredictionShareCaption,
  readShareTokenFromSearchParams,
  readShortShareIdFromSearchParams
} from "@/lib/predictions/share";
import { isShortShareId } from "@/lib/predictions/share-store";
import { resolvePredictionSharePayload } from "@/lib/predictions/share-resolve";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const shortId = readShortShareIdFromSearchParams(params);
  const legacyToken = readShareTokenFromSearchParams(params);
  const payload = await resolvePredictionSharePayload(shortId || legacyToken);
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

export default async function SharePredictionLegacyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shortId = readShortShareIdFromSearchParams(params);

  if (shortId && isShortShareId(shortId)) {
    redirect(`/share/p/${encodeURIComponent(shortId)}`);
  }

  const legacyToken = readShareTokenFromSearchParams(params);
  if (legacyToken) {
    const payload = await resolvePredictionSharePayload(legacyToken);
    if (payload) {
      if (isShortShareId(legacyToken)) {
        redirect(`/share/p/${encodeURIComponent(legacyToken)}`);
      }
      redirect(`/share/prediction/${legacyToken}`);
    }
  }

  return <SharePredictionUnavailable />;
}
