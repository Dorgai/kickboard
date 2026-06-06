"use client";

import { MatchTeamsLine, TeamLabel } from "@/components/team-label";
import {
  fixturesForGroupDisplay,
  formatTournamentFixtureDate,
  knockoutPlaceholdersForStage,
  type TournamentScheduleFixture
} from "@/lib/feeds/wc26-tournament-schedule";
import {
  navigateToPredictFixture,
  navigateToPredictGroup
} from "@/lib/session-checkpoint/navigate";

type TournamentGroupScheduleProps = {
  group: {
    group: string;
    teams: string[];
    fixtures: TournamentScheduleFixture[];
  };
};

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
          <li className="current-event-fixture-row" key={`${group.group}-fixture-${index}`}>
            <div className="current-event-fixture-match">
              <MatchTeamsLine
                awayTeam={fixture.awayTeam}
                homeTeam={fixture.homeTeam}
                layout="stacked"
                size="xs"
              />
              <span className="current-event-fixture-date">
                {formatTournamentFixtureDate(fixture.date)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <button
        className="button secondary current-event-predict-action"
        type="button"
        onClick={() => navigateToPredictGroup(group.group, { scrollToTop: true })}
      >
        Make your predictions for this group
      </button>
    </div>
  );
}

export function TournamentKnockoutSchedule({ stage }: { stage: string }) {
  const matches = knockoutPlaceholdersForStage(stage);

  return (
    <ul className="current-event-fixture-list" aria-label={`${stage} fixtures`}>
      {matches.map((match) => (
        <li className="current-event-fixture-row current-event-fixture-row--knockout" key={match.matchId}>
          <div className="current-event-fixture-match">
            <span className="current-event-fixture-stage-label">{match.label}</span>
            <MatchTeamsLine
              awayTeam={match.awayTeam}
              homeTeam={match.homeTeam}
              layout="stacked"
              size="xs"
            />
            <span className="current-event-fixture-date">{formatTournamentFixtureDate(match.date)}</span>
          </div>
          <button
            className="button secondary current-event-predict-action current-event-predict-action--game"
            type="button"
            onClick={() => navigateToPredictFixture(match.fixtureKey, { scrollToTop: true })}
          >
            Make predictions for this game
          </button>
        </li>
      ))}
    </ul>
  );
}
