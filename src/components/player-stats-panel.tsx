"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatPlayerMetric,
  PLAYER_CAREER_METRICS,
  PLAYER_MATCH_METRICS,
  type CareerAppearance,
  type PlayerStatRow
} from "@/lib/player-stat-metrics";
import { PlayerMetricsGrid } from "@/components/player-metrics-grid";
import { PlayerStatsTable } from "@/components/player-stats-table";
import { TeamLabel } from "@/components/team-label";

type MatchMeta = {
  matchId: number;
  date: string;
  stage: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  stadium: string | null;
};

type TournamentSummary = {
  appearances: CareerAppearance[];
  totals: {
    appearances: number;
    goals: number;
    assists: number;
    shots: number;
    xg: number;
  };
  note?: string;
};

type PlayerStatsPanelProps = {
  players: PlayerStatRow[];
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number | null) => void;
  matchMeta: MatchMeta;
  competitionId: number;
  seasonId: number;
  competitionLabel: string;
  /** Tighter copy and collapsed secondary sections (match focus row). */
  compact?: boolean;
};

export function PlayerStatsPanel({
  players,
  selectedPlayerId,
  onSelectPlayer,
  matchMeta,
  competitionId,
  seasonId,
  competitionLabel,
  compact = false
}: PlayerStatsPanelProps) {
  const [career, setCareer] = useState<TournamentSummary | null>(null);
  const [careerLoading, setCareerLoading] = useState(false);
  const [careerError, setCareerError] = useState<string | null>(null);

  const selectedPlayer = useMemo(() => {
    if (selectedPlayerId == null) return undefined;
    return players.find((row) => row.playerId === selectedPlayerId);
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (!selectedPlayerId) {
      setCareer(null);
      setCareerError(null);
      return;
    }

    let cancelled = false;

    async function loadCareer() {
      setCareerLoading(true);
      setCareerError(null);
      setCareer(null);

      try {
        const params = new URLSearchParams({
          playerId: String(selectedPlayerId),
          competitionId: String(competitionId),
          seasonId: String(seasonId),
          excludeMatchId: String(matchMeta.matchId)
        });
        const response = await fetch(`/api/feeds/historical/player-tournament?${params}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as TournamentSummary & { error?: string; connected?: boolean };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load tournament record");
        }

        if (!cancelled) {
          setCareer({
            appearances: payload.appearances,
            totals: payload.totals,
            note: payload.note
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setCareerError(loadError instanceof Error ? loadError.message : "Unknown tournament load error");
        }
      } finally {
        if (!cancelled) setCareerLoading(false);
      }
    }

    loadCareer();
    return () => {
      cancelled = true;
    };
  }, [competitionId, matchMeta.matchId, seasonId, selectedPlayerId]);

  const selectedPlayerMatchMetrics = useMemo(() => {
    if (!selectedPlayer) return [];
    return PLAYER_MATCH_METRICS.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.format(selectedPlayer)
    }));
  }, [selectedPlayer]);

  const careerTotalMetrics = useMemo(() => {
    if (!career) return [];
    return [
      {
        id: "appearances",
        label: "Matches",
        value: String(career.totals.appearances)
      },
      ...PLAYER_CAREER_METRICS.map((metric) => ({
        id: metric.id,
        label: metric.label,
        value: formatPlayerMetric(metric.id, career.totals)
      }))
    ];
  }, [career]);

  return (
    <section
      className={`match-detail-section player-stats-section data-card surface-muted player-stats-panel${
        compact ? " player-stats-panel--compact" : ""
      }`}
    >
      <div className="section-heading compact">
        <div>
          <h3>Player stats</h3>
          {!compact ? (
            <p className="player-stats-summary player-stats-summary--caption">
              Select a player in Lineups. This panel shows that player&apos;s match line only.
            </p>
          ) : null}
        </div>
        {selectedPlayerId ? (
          <button className="text-button" type="button" onClick={() => onSelectPlayer(null)}>
            Clear player
          </button>
        ) : null}
      </div>

      {!selectedPlayer ? (
        <p className="inline-status player-stats-empty-prompt">
          {compact ? "Select a player in Lineups." : "No player selected — tap a name in Lineups to view their stats for this match."}
        </p>
      ) : (
        <>
          <article className="player-focus-card">
            <header className="player-focus-header">
              <div>
                {!compact ? <p className="eyebrow">This match</p> : null}
                <h4>{selectedPlayer.player}</h4>
                <p className="player-focus-meta-caption">
                  <TeamLabel name={selectedPlayer.team} size={compact ? "xs" : "sm"} />
                  {!compact ? (
                    <>
                      {" · "}
                      {matchMeta.stage ?? "Stage"} · {matchMeta.date}
                      {matchMeta.stadium ? ` · ${matchMeta.stadium}` : ""}
                    </>
                  ) : null}
                </p>
                {!compact ? (
                  <p className="player-focus-meta-caption">
                    {matchMeta.homeTeam} {matchMeta.homeScore}–{matchMeta.awayScore} {matchMeta.awayTeam}
                  </p>
                ) : null}
              </div>
            </header>
            <PlayerMetricsGrid compact={compact} items={selectedPlayerMatchMetrics} />
          </article>

          <section className="player-career-section">
            {compact ? (
              <details className="player-career-disclosure">
                <summary>Tournament record ({competitionLabel})</summary>
                {careerLoading ? <p className="inline-status">Loading…</p> : null}
                {careerError ? <p className="inline-error">{careerError}</p> : null}
                {!careerLoading && !careerError && career ? (
                  <PlayerCareerBody career={career} careerTotalMetrics={careerTotalMetrics} />
                ) : null}
              </details>
            ) : (
              <>
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Tournament record</p>
                    <h4>{competitionLabel}</h4>
                    <p className="player-stats-summary player-stats-summary--caption">
                      Other matches in this World Cup from StatsBomb lineups and events (excluding this fixture).
                    </p>
                  </div>
                </div>

                {careerLoading ? <p className="inline-status">Loading tournament appearances…</p> : null}
                {careerError ? <p className="inline-error">{careerError}</p> : null}

                {!careerLoading && !careerError && career ? (
                  <PlayerCareerBody career={career} careerTotalMetrics={careerTotalMetrics} />
                ) : null}
              </>
            )}
          </section>
        </>
      )}

      {players.length > 0 ? (
        <details className="player-stats-full-table-disclosure">
          <summary>Full match player table ({players.length} players)</summary>
          <PlayerStatsTable
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={onSelectPlayer}
            embedded
          />
        </details>
      ) : null}
    </section>
  );
}

function PlayerCareerBody({
  career,
  careerTotalMetrics
}: {
  career: TournamentSummary;
  careerTotalMetrics: { id: string; label: string; value: string }[];
}) {
  return (
    <>
      {career.appearances.length === 0 ? (
        <p className="inline-status">No other tournament appearances found in the open-data feed.</p>
      ) : (
        <>
          <PlayerMetricsGrid compact items={careerTotalMetrics} />

          <div className="player-career-table" role="table">
            <div className="player-career-row player-career-row--head" role="row">
              <span role="columnheader">
                Date
                <span className="player-career-col-caption">Kickoff date (UTC) from StatsBomb.</span>
              </span>
              <span role="columnheader">
                Stage
                <span className="player-career-col-caption">Competition stage label.</span>
              </span>
              <span role="columnheader">
                Opponent
                <span className="player-career-col-caption">Opposing national team in that match.</span>
              </span>
              <span role="columnheader">
                Score
                <span className="player-career-col-caption">Final score when data is present.</span>
              </span>
              {PLAYER_CAREER_METRICS.map((metric) => (
                <span key={metric.id} role="columnheader">
                  {metric.label}
                  <span className="player-career-col-caption">{metric.caption}</span>
                </span>
              ))}
            </div>
            {career.appearances.map((appearance) => (
              <div className="player-career-row" key={appearance.matchId} role="row">
                <span>{appearance.date}</span>
                <span>{appearance.stage ?? "—"}</span>
                <span>
                  <TeamLabel name={appearance.opponent} size="xs" />
                </span>
                <span>
                  {appearance.homeTeam} {appearance.homeScore}–{appearance.awayScore} {appearance.awayTeam}
                </span>
                {PLAYER_CAREER_METRICS.map((metric) => (
                  <span key={`${appearance.matchId}-${metric.id}`}>
                    {formatPlayerMetric(metric.id, appearance)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
      {career.note ? <p className="player-career-note">{career.note}</p> : null}
    </>
  );
}
