import Link from "next/link";
import type { Metadata } from "next";
import {
  buildPredictionAppDeepLink,
  buildPredictionShareCaption,
  decodePredictionShare
} from "@/lib/predictions/share";
import {
  formatScorerPicksSummary,
  outcomeLabel
} from "@/lib/fixture-predictions/types";

type PageProps = {
  searchParams: Promise<{ d?: string }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const payload = decodePredictionShare(params.d ?? "");
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

export default async function SharePredictionPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const payload = decodePredictionShare(params.d ?? "");

  if (!payload) {
    return (
      <main className="share-prediction-page">
        <div className="share-prediction-card data-card">
          <h1>Prediction link unavailable</h1>
          <p className="inline-status">This share link is invalid or expired.</p>
          <Link className="button primary" href="/">
            Go to Kickboard
          </Link>
        </div>
      </main>
    );
  }

  const appLink = buildPredictionAppDeepLink(payload.fixtureKey);
  const who = payload.displayName?.trim();

  return (
    <main className="share-prediction-page">
      <div className="share-prediction-card data-card">
        <p className="share-prediction-eyebrow">Kickboard prediction</p>
        <h1>{payload.fixtureLabel}</h1>
        {who ? <p className="share-prediction-who">{who}</p> : null}

        <ul className="share-prediction-lines">
          {payload.predictedOutcome ? (
            <li>
              <strong>Result</strong>{" "}
              {outcomeLabel(payload.predictedOutcome, payload.homeTeam, payload.awayTeam)}
            </li>
          ) : null}
          {payload.homeScore !== null && payload.awayScore !== null ? (
            <li>
              <strong>Score</strong> {payload.homeScore}–{payload.awayScore}
            </li>
          ) : null}
          {payload.scorerPicks.length > 0 ? (
            <li>
              <strong>Scorers</strong> {formatScorerPicksSummary(payload.scorerPicks)}
            </li>
          ) : null}
        </ul>

        <Link className="button primary" href={appLink}>
          Make your picks on Kickboard
        </Link>
      </div>
    </main>
  );
}
