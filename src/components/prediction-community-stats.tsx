"use client";

import { useEffect, useState } from "react";
import type { CommunityDistribution } from "@/lib/predictions/community-distribution-shared";
import {
  lookupTeamCrowdPercent,
  outcomeCrowdPercents
} from "@/lib/predictions/community-distribution-shared";

type DistributionScope = "fixture" | "tournament";

type UseCommunityDistributionInput = {
  scope: DistributionScope;
  category: string;
  fixtureKey?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeLabel?: string;
  awayLabel?: string;
  tournamentKey?: string;
  enabled?: boolean;
};

export function useCommunityDistribution(input: UseCommunityDistributionInput) {
  const [data, setData] = useState<CommunityDistribution | null>(null);
  const [loading, setLoading] = useState(false);
  const enabled = input.enabled !== false;

  useEffect(() => {
    if (!enabled) {
      setData(null);
      return;
    }

    const params = new URLSearchParams({
      scope: input.scope,
      category: input.category
    });

    if (input.scope === "fixture") {
      if (!input.fixtureKey) return;
      params.set("fixtureKey", input.fixtureKey);
      if (input.homeTeam) params.set("homeTeam", input.homeTeam);
      if (input.awayTeam) params.set("awayTeam", input.awayTeam);
      if (input.homeLabel) params.set("homeLabel", input.homeLabel);
      if (input.awayLabel) params.set("awayLabel", input.awayLabel);
    } else if (input.tournamentKey) {
      params.set("tournamentKey", input.tournamentKey);
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/predictions/community-distribution?${params}`, {
          cache: "no-store"
        });
        if (!cancelled && response.ok) {
          setData((await response.json()) as CommunityDistribution);
        } else if (!cancelled) {
          setData(null);
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    input.awayLabel,
    input.awayTeam,
    input.category,
    input.fixtureKey,
    input.homeLabel,
    input.homeTeam,
    input.scope,
    input.tournamentKey
  ]);

  return { data, loading };
}

function formatParticipation(percent: number, totalPicks: number) {
  if (totalPicks <= 0) return "No community picks yet";
  return `${percent}% of fans have placed picks · ${totalPicks.toLocaleString()} total`;
}

type PredictionCrowdParticipationProps = {
  distribution: CommunityDistribution | null | undefined;
  loading?: boolean;
  className?: string;
};

export function PredictionCrowdParticipation({
  distribution,
  loading = false,
  className = ""
}: PredictionCrowdParticipationProps) {
  if (loading) {
    return <p className={`prediction-crowd-meta prediction-crowd-meta--loading ${className}`.trim()}>Loading community picks…</p>;
  }

  const totalPicks = distribution?.totalPicks ?? 0;
  const participationPercent = distribution?.participationPercent ?? 0;

  return (
    <p className={`prediction-crowd-meta ${className}`.trim()}>
      {formatParticipation(participationPercent, totalPicks)}
    </p>
  );
}

type PredictionOutcomeCrowdBarProps = {
  homeLabel: string;
  awayLabel: string;
  distribution: CommunityDistribution | null | undefined;
  loading?: boolean;
  className?: string;
};

export function PredictionOutcomeCrowdBar({
  homeLabel,
  awayLabel,
  distribution,
  loading = false,
  className = ""
}: PredictionOutcomeCrowdBarProps) {
  const { home, draw, away, totalPicks, participationPercent } = outcomeCrowdPercents(distribution);

  if (loading) {
    return (
      <div className={`prediction-crowd-outcome ${className}`.trim()}>
        <p className="prediction-crowd-meta prediction-crowd-meta--loading">Loading community picks…</p>
      </div>
    );
  }

  if (totalPicks <= 0) {
    return (
      <div className={`prediction-crowd-outcome ${className}`.trim()}>
        <p className="prediction-crowd-meta">No community picks yet for this match.</p>
      </div>
    );
  }

  const ariaLabel = `Community picks: ${homeLabel} ${home}%, Draw ${draw}%, ${awayLabel} ${away}%`;

  return (
    <div className={`prediction-crowd-outcome ${className}`.trim()}>
      <p className="prediction-crowd-meta">{formatParticipation(participationPercent, totalPicks)}</p>
      <div
        aria-label={ariaLabel}
        className="prediction-crowd-bar"
        role="img"
      >
        {home > 0 ? (
          <span
            className="prediction-crowd-bar-segment prediction-crowd-bar-segment--home"
            style={{ flexGrow: home }}
            title={`${homeLabel} ${home}%`}
          />
        ) : null}
        {draw > 0 ? (
          <span
            className="prediction-crowd-bar-segment prediction-crowd-bar-segment--draw"
            style={{ flexGrow: draw }}
            title={`Draw ${draw}%`}
          />
        ) : null}
        {away > 0 ? (
          <span
            className="prediction-crowd-bar-segment prediction-crowd-bar-segment--away"
            style={{ flexGrow: away }}
            title={`${awayLabel} ${away}%`}
          />
        ) : null}
      </div>
      <div className="prediction-crowd-bar-labels" aria-hidden>
        <span className="prediction-crowd-bar-label prediction-crowd-bar-label--home">
          <span className="prediction-crowd-bar-label-name">{homeLabel}</span>
          <span className="prediction-crowd-bar-label-pct">{home}%</span>
        </span>
        <span className="prediction-crowd-bar-label prediction-crowd-bar-label--draw">
          <span className="prediction-crowd-bar-label-name">Draw</span>
          <span className="prediction-crowd-bar-label-pct">{draw}%</span>
        </span>
        <span className="prediction-crowd-bar-label prediction-crowd-bar-label--away">
          <span className="prediction-crowd-bar-label-name">{awayLabel}</span>
          <span className="prediction-crowd-bar-label-pct">{away}%</span>
        </span>
      </div>
    </div>
  );
}

type PredictionTeamCrowdMeterProps = {
  team: string;
  distribution: CommunityDistribution | null | undefined;
  className?: string;
};

export function PredictionTeamCrowdMeter({
  team,
  distribution,
  className = ""
}: PredictionTeamCrowdMeterProps) {
  const percent = lookupTeamCrowdPercent(distribution, team);
  if (percent === null || percent <= 0) return null;

  return (
    <span className={`prediction-crowd-team-meter ${className}`.trim()}>
      <span className="prediction-crowd-team-meter-bar" style={{ width: `${Math.min(percent, 100)}%` }} />
      <span className="prediction-crowd-team-meter-pct">{percent}%</span>
    </span>
  );
}

type PredictionPlayerCrowdListProps = {
  distribution: CommunityDistribution | null | undefined;
  loading?: boolean;
  className?: string;
};

export function PredictionPlayerCrowdList({
  distribution,
  loading = false,
  className = ""
}: PredictionPlayerCrowdListProps) {
  if (loading) {
    return <p className={`prediction-crowd-meta prediction-crowd-meta--loading ${className}`.trim()}>Loading community picks…</p>;
  }

  const options = distribution?.options.filter((option) => option.count > 0) ?? [];
  if (!options.length) {
    return (
      <p className={`prediction-crowd-meta ${className}`.trim()}>No community picks yet.</p>
    );
  }

  const maxPercent = Math.max(...options.map((option) => option.percent), 1);

  return (
    <div className={`prediction-crowd-player-list ${className}`.trim()}>
      <PredictionCrowdParticipation distribution={distribution} />
      <ul className="prediction-crowd-player-options">
        {options.map((option) => (
          <li key={option.key} className="prediction-crowd-player-option">
            <div className="prediction-crowd-player-option-head">
              <span className="prediction-crowd-player-option-name">{option.label ?? option.key}</span>
              <span className="prediction-crowd-player-option-pct">{option.percent}%</span>
            </div>
            <span className="prediction-crowd-player-option-track">
              <span
                className="prediction-crowd-player-option-fill"
                style={{ width: `${(option.percent / maxPercent) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
