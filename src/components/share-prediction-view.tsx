import Link from "next/link";
import {
  buildPredictionAppDeepLink,
  buildTournamentAppDeepLink,
  isTournamentSharePayload,
  type SharePayload,
  type TournamentSharePayload
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
          This share link is invalid, incomplete, or was shortened by another app. Ask your friend to
          open Predictions, tap <strong>Copy</strong> or <strong>More…</strong> again, and send the
          short MyPicks link (it looks like <strong>/share/p/…</strong>, not a long code in the
          URL).
        </p>
        <Link className="button primary" href="/">
          Go to MyPicks
        </Link>
      </div>
    </main>
  );
}

export function SharePredictionView({ payload }: { payload: SharePayload }) {
  if (isTournamentSharePayload(payload)) {
    return <ShareTournamentView payload={payload} />;
  }

  const appLink = buildPredictionAppDeepLink(payload.fixtureKey);
  const who = payload.displayName?.trim();

  return (
    <main className="share-prediction-page">
      <div className="share-prediction-card data-card">
        <p className="share-prediction-eyebrow">MyPicks prediction</p>
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
          Make your picks on MyPicks
        </Link>
      </div>
    </main>
  );
}

function ShareTournamentView({ payload }: { payload: TournamentSharePayload }) {
  const appLink = buildTournamentAppDeepLink(payload.tournamentKey);
  const who = payload.displayName?.trim();

  return (
    <main className="share-prediction-page">
      <div className="share-prediction-card data-card">
        <p className="share-prediction-eyebrow">MyPicks tournament picks</p>
        <h1>{payload.tournamentLabel}</h1>
        {who ? <p className="share-prediction-who">{who}</p> : null}

        <ul className="share-prediction-lines">
          {payload.predictedChampion ? (
            <li>
              <strong>Champion</strong> {payload.predictedChampion}
            </li>
          ) : null}
          {payload.predictedFinalOpponent ? (
            <li>
              <strong>Final opponent</strong> {payload.predictedFinalOpponent}
            </li>
          ) : null}
          {payload.predictedTopScorer ? (
            <li>
              <strong>Top scorer</strong> {payload.predictedTopScorer.playerName}
            </li>
          ) : null}
          {payload.predictedTopScorerBoard ? (
            <li>
              <strong>Scorer board</strong>
              <ul className="share-prediction-nested-lines">
                {payload.predictedTopScorerBoard.picks.map((pick) => (
                  <li key={pick.rank}>
                    #{pick.rank} {pick.playerName} — {pick.predictedGoals} goals
                  </li>
                ))}
              </ul>
            </li>
          ) : null}
          {payload.predictedBestPlayer ? (
            <li>
              <strong>Best player</strong> {payload.predictedBestPlayer.playerName}
            </li>
          ) : null}
        </ul>

        <Link className="button primary" href={appLink}>
          Make your tournament picks on MyPicks
        </Link>
      </div>
    </main>
  );
}
