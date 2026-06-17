"use client";

import { useEffect, useMemo, useState } from "react";
import { flagCodeFallbackChain, flagImageUrl, resolveCountryCode } from "@/lib/country-flags";

type CountryFlagProps = {
  code?: string | null;
  label?: string;
  size?: "xs" | "sm" | "md";
};

const FLAG_SIZES = {
  xs: { width: 16, height: 12 },
  sm: { width: 20, height: 15 },
  md: { width: 24, height: 18 }
} as const;

export function CountryFlag({ code, label, size = "sm" }: CountryFlagProps) {
  const fallbackCodes = useMemo(() => (code ? flagCodeFallbackChain(code) : []), [code]);
  const [codeIndex, setCodeIndex] = useState(0);

  useEffect(() => {
    setCodeIndex(0);
  }, [code]);

  if (!code || codeIndex >= fallbackCodes.length) {
    return (
      <span
        aria-hidden={label ? undefined : true}
        aria-label={label ? `Flag of ${label}` : undefined}
        className={`country-flag country-flag-${size} country-flag-fallback`}
        title={label}
      />
    );
  }

  const dimensions = FLAG_SIZES[size];
  const activeCode = fallbackCodes[codeIndex]!;
  const src = flagImageUrl(activeCode, size);

  return (
    <span className={`country-flag country-flag-${size}`}>
      <img
        alt={label ? `Flag of ${label}` : ""}
        className="country-flag-img"
        decoding="async"
        height={dimensions.height}
        loading="eager"
        referrerPolicy="no-referrer"
        src={src}
        width={dimensions.width}
        onError={() => setCodeIndex((index) => index + 1)}
      />
    </span>
  );
}

type TeamLabelProps = {
  name: string;
  countryHint?: string | null;
  size?: "xs" | "sm" | "md";
  /** Flag above name (e.g. compact prediction chips). */
  layout?: "inline" | "stacked";
  className?: string;
};

export function TeamLabel({
  name,
  countryHint,
  size = "sm",
  layout = "inline",
  className = ""
}: TeamLabelProps) {
  const code = resolveCountryCode(countryHint ?? name);

  return (
    <span
      className={`team-label team-label-${size}${layout === "stacked" ? " team-label-stacked" : ""} ${className}`.trim()}
    >
      <CountryFlag code={code} label={name} size={size} />
      <span className="team-label-text">{name}</span>
    </span>
  );
}

type MatchTeamsLineProps = {
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  size?: "xs" | "sm" | "md";
  layout?: "inline" | "stacked";
  className?: string;
};

export function MatchTeamsLine({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  size = "sm",
  layout = "inline",
  className = ""
}: MatchTeamsLineProps) {
  const hasScore = homeScore !== undefined && awayScore !== undefined;

  return (
    <span
      className={`match-teams-line${layout === "stacked" ? " match-teams-line-stacked" : ""} ${className}`.trim()}
    >
      <TeamLabel name={homeTeam} size={size} />
      {hasScore ? <span className="match-score-pill">{homeScore}–{awayScore}</span> : null}
      <TeamLabel name={awayTeam} size={size} />
    </span>
  );
}
