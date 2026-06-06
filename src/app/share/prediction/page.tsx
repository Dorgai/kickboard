import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SharePredictionUnavailable } from "@/components/share-prediction-view";
import {
  buildShareCaption,
  readShareTokenFromSearchParams,
  readShortShareIdFromSearchParams,
  sharePayloadOpenGraphTitle,
  sharePayloadTitle
} from "@/lib/predictions/share";
import { isShortShareId } from "@/lib/predictions/share-store";
import { resolveSharePayload } from "@/lib/predictions/share-resolve";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const shortId = readShortShareIdFromSearchParams(params);
  const legacyToken = readShareTokenFromSearchParams(params);
  const payload = await resolveSharePayload(shortId || legacyToken);
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

export default async function SharePredictionLegacyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const shortId = readShortShareIdFromSearchParams(params);

  if (shortId && isShortShareId(shortId)) {
    redirect(`/share/p/${encodeURIComponent(shortId)}`);
  }

  const legacyToken = readShareTokenFromSearchParams(params);
  if (legacyToken) {
    const payload = await resolveSharePayload(legacyToken);
    if (payload) {
      if (isShortShareId(legacyToken)) {
        redirect(`/share/p/${encodeURIComponent(legacyToken)}`);
      }
      redirect(`/share/prediction/${legacyToken}`);
    }
  }

  return <SharePredictionUnavailable />;
}
