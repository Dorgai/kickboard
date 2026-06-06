"use client";

import { MatchTeamsLine, TeamLabel } from "@/components/team-label";
import {
  fixtureKeyForGroupMatch,
  fixturesForGroupDisplay,
  formatTournamentFixtureDate,
  knockoutPlaceholdersForStage,
  type TournamentScheduleFixture
} from "@/lib/feeds/wc26-tournament-schedule";
import { navigateToPredictFixture } from "@/lib/session-checkpoint/navigate";

type TournamentGroupScheduleProps = {
  group: {
    group: string;
    teams: string[];
    fixtures: TournamentScheduleFixture[];
  };
};

function TournamentFixtureRow({
  fixtureKey,
  fixture,
  metaLabel
}: {
  fixtureKey: string;
  fixture: TournamentScheduleFixture;
  metaLabel?: string;
}) {
  return (
    <li className="current-event-fixture-row current-event-fixture-row--with-predict">
      <div className="current-event-fixture-match">
        {metaLabel ? <span className="current-event-fixture-stage-label">{metaLabel}</span> : null}
        <MatchTeamsLine
          awayTeam={fixture.awayTeam}
          homeTeam={fixture.homeTeam}
          layout="stacked"
          size="xs"
        />
        <span className="current-event-fixture-date">{formatTournamentFixtureDate(fixture.date)}</span>
      </div>
      <button
        aria-label={`Predict ${fixture.homeTeam} vs ${fixture.awayTeam}`}
        className="button secondary current-event-predict-action current-event-predict-action--game"
        type="button"
        onClick={() => navigateToPredictFixture(fixtureKey, { scrollToTop: true })}
      >
        Predict
      </button>
    </li>
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

      <ul className="current-event-fixture-list" aria-label={`Group ${group.group} fixtures`}>
        {fixtures.map((fixture, index) => (
          <TournamentFixtureRow
            key={`${group.group}-fixture-${index}`}
            fixture={fixture}
            fixtureKey={fixtureKeyForGroupMatch(group.group, fixture, index)}
          />
        ))}
      </ul>
    </div>
  );
}

export function TournamentKnockoutSchedule({ stage }: { stage: string }) {
  const matches = knockoutPlaceholdersForStage(stage);

  return (
    <ul className="current-event-fixture-list" aria-label={`${stage} fixtures`}>
      {matches.map((match) => (
        <TournamentFixtureRow
          key={match.matchId}
          fixture={match}
          fixtureKey={match.fixtureKey}
          metaLabel={match.label}
        />
      ))}
    </ul>
  );
}
