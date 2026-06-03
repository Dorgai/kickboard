import Link from "next/link";
import {
  buildPredictionAppDeepLink,
  type PredictionSharePayload
} from "@/lib/predictions/share";
import {
  formatScorerPicksSummary,
  outcomeLabel
} from "@/lib/fixture-predictions/types";

export function SharePredictionUnavailable() {
  return (
    <main className="share-prediction-page">
      <div className="share-prediction-card data-card">
        <h1>Prediction link unavailable</h1>
        <p className="inline-status">
          This link is missing or no longer available. Ask your friend to open Predictions, tap{" "}
          <strong>Copy</strong> again, and send the new short Kickboard link (it looks like{" "}
          <strong>/share/p/…</strong>).
        </p>
        <Link className="button primary" href="/">
          Go to Kickboard
        </Link>
      </div>
    </main>
  );
}

export function SharePredictionView({ payload }: { payload: PredictionSharePayload }) {
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
