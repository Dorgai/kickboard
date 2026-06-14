"use client";

import {
  createContext,
  useContext,
  type ReactNode
} from "react";
import { useMatchBoardOptional } from "@/components/match-board-provider";
import { MatchGoalScorersLine } from "@/components/match-goal-scorers-line";
import { MatchTeamsLine, TeamLabel } from "@/components/team-label";
import { useLiveClock } from "@/hooks/use-live-clock";
import { useTournamentFixturePredictions } from "@/hooks/use-tournament-fixture-predictions";
import { parseWorldCupFixtureDate } from "@/lib/fixtures/fixture-date";
import {
  fixtureKeyForGroupMatch,
  fixturesForGroupDisplay,
  formatTournamentFixtureDate,
  knockoutPlaceholdersForStage,
  type TournamentScheduleFixture
} from "@/lib/feeds/wc26-tournament-schedule";
import { resolveLiveElapsed } from "@/lib/fixtures/live-elapsed";
import { formatFixturePredictionSummary } from "@/lib/fixture-predictions/types";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";

type TournamentGroupScheduleProps = {
  group: {
    group: string;
    teams: string[];
    fixtures: TournamentScheduleFixture[];
  };
};

type TournamentPredictionsLookup = ReturnType<typeof useTournamentFixturePredictions>["lookup"];

const TournamentPredictionsContext = createContext<TournamentPredictionsLookup | null>(null);

function useTournamentPredictionsLookup() {
  return useContext(TournamentPredictionsContext);
}

export function TournamentFixturePredictionsProvider({ children }: { children: ReactNode }) {
  const { lookup } = useTournamentFixturePredictions();
  return (
    <TournamentPredictionsContext.Provider value={lookup}>{children}</TournamentPredictionsContext.Provider>
  );
}

function splitFixtureColumns<T>(items: T[]): [T[], T[]] {
  const splitAt = Math.ceil(items.length / 2);
  return [items.slice(0, splitAt), items.slice(splitAt)];
}

function isTournamentFixtureStarted(
  fixture: TournamentScheduleFixture,
  liveStatus: "upcoming" | "live" | "finished" | undefined
) {
  if (liveStatus === "live" || liveStatus === "finished") return true;
  const kickoff = parseWorldCupFixtureDate(fixture.date);
  return kickoff != null && Date.now() >= kickoff.getTime();
}

function TournamentFixtureRow({
  fixtureKey,
  fixture,
  metaLabel
}: {
  fixtureKey: string;
  fixture: TournamentScheduleFixture;
  metaLabel?: string;
}) {
  const matchBoard = useMatchBoardOptional();
  const lookupPrediction = useTournamentPredictionsLookup();
  const live = matchBoard?.lookupByKey(fixtureKey);
  const showScore = live?.homeGoals != null && live?.awayGoals != null;
  const liveNowMs = useLiveClock(live?.status === "live");
  const liveElapsed =
    live?.status === "live"
      ? resolveLiveElapsed("live", fixture.date, live.elapsed, liveNowMs)
      : null;
  const started = isTournamentFixtureStarted(fixture, live?.status);
  const prediction = started
    ? lookupPrediction?.({
        fixtureKey,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam
      }) ?? null
    : null;
  const predictionSummary = prediction
    ? formatFixturePredictionSummary(prediction, fixture.homeTeam, fixture.awayTeam)
    : null;

  return (
    <li className="current-event-fixture-row current-event-fixture-row--with-predict">
      <div className="current-event-fixture-match">
        {metaLabel ? <span className="current-event-fixture-stage-label">{metaLabel}</span> : null}
        {live?.status === "live" ? (
          <span className="current-event-fixture-live-badge">
            {liveElapsed != null ? `Live · ${liveElapsed}'` : "Live"}
          </span>
        ) : live?.status === "finished" ? (
          <span className="current-event-fixture-live-badge current-event-fixture-live-badge--ft">
            {live.statusShort === "FT" ? "FT" : live.statusShort || "FT"}
          </span>
        ) : null}
        <MatchTeamsLine
          awayScore={showScore ? live.awayGoals ?? undefined : undefined}
          awayTeam={fixture.awayTeam}
          homeScore={showScore ? live.homeGoals ?? undefined : undefined}
          homeTeam={fixture.homeTeam}
          layout="stacked"
          size="xs"
        />
        {live?.goalScorers && live.goalScorers.length > 0 ? (
          <MatchGoalScorersLine
            awayTeam={fixture.awayTeam}
            compact
            goals={live.goalScorers}
            homeTeam={fixture.homeTeam}
          />
        ) : null}
        <span className="current-event-fixture-date">{formatTournamentFixtureDate(fixture.date)}</span>
      </div>
      {started ? (
        predictionSummary ? (
          <p className="current-event-fixture-prediction" aria-label="Your pick for this match">
            {predictionSummary}
          </p>
        ) : null
      ) : (
        <button
          aria-label={`Predict ${fixture.homeTeam} vs ${fixture.awayTeam}`}
          className="button secondary current-event-predict-action current-event-predict-action--game"
          type="button"
          onClick={() => navigateToPredictFixture(fixtureKey, { scrollToTop: true })}
        >
          Predict
        </button>
      )}
    </li>
  );
}

function TournamentFixtureBlock({
  ariaLabel,
  fixtures
}: {
  ariaLabel: string;
  fixtures: Array<{ fixture: TournamentScheduleFixture; fixtureKey: string; metaLabel?: string }>;
}) {
  if (!fixtures.length) return null;

  return (
    <section className="current-event-fixture-block data-card">
      <ul className="current-event-fixture-list" aria-label={ariaLabel}>
        {fixtures.map((entry) => (
          <TournamentFixtureRow
            key={entry.fixtureKey}
            fixture={entry.fixture}
            fixtureKey={entry.fixtureKey}
            metaLabel={entry.metaLabel}
          />
        ))}
      </ul>
    </section>
  );
}

function TournamentFixtureColumns({
  ariaLabel,
  entries
}: {
  ariaLabel: string;
  entries: Array<{ fixture: TournamentScheduleFixture; fixtureKey: string; metaLabel?: string }>;
}) {
  const [leftEntries, rightEntries] = splitFixtureColumns(entries);

  return (
    <div className="current-event-fixture-columns">
      <TournamentFixtureBlock ariaLabel={`${ariaLabel} · column 1`} fixtures={leftEntries} />
      <TournamentFixtureBlock ariaLabel={`${ariaLabel} · column 2`} fixtures={rightEntries} />
    </div>
  );
}

export function TournamentGroupSchedule({ group }: TournamentGroupScheduleProps) {
  const fixtures = fixturesForGroupDisplay(group);

  return (
    <div className="current-event-group-schedule">
      <div className="bracket-cluster">
        <div className="bracket-cluster-teams">
          {group.teams.length ? (
            group.teams.map((team) => (
              <div className="bracket-team-slot" key={`${group.group}-${team}`}>
                <TeamLabel name={team} size="xs" />
              </div>
            ))
          ) : (
            <div className="bracket-team-slot">
              <span className="current-event-fixture-placeholder">Teams TBD</span>
            </div>
          )}
        </div>
      </div>

      <TournamentFixtureColumns
        ariaLabel={`Group ${group.group} fixtures`}
        entries={fixtures.map((fixture, index) => ({
          fixture,
          fixtureKey: fixtureKeyForGroupMatch(group.group, fixture, index)
        }))}
      />
    </div>
  );
}

export function TournamentKnockoutSchedule({ stage }: { stage: string }) {
  const matches = knockoutPlaceholdersForStage(stage);

  return (
    <TournamentFixtureColumns
      ariaLabel={`${stage} fixtures`}
      entries={matches.map((match) => ({
        fixture: match,
        fixtureKey: match.fixtureKey,
        metaLabel: match.label
      }))}
    />
  );
}
