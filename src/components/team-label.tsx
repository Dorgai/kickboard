"use client";

import { flagImageUrl, resolveCountryCode } from "@/lib/country-flags";

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
  if (!code) {
    return <span aria-hidden="true" className={`country-flag country-flag-${size} country-flag-fallback`} />;
  }

  const dimensions = FLAG_SIZES[size];
  const src = flagImageUrl(code, size);

  return (
    <span className={`country-flag country-flag-${size}`}>
      {/* Native img: external flag CDN; avoids Next image optimizer 400s on Railway */}
      <img
        alt={label ? `Flag of ${label}` : ""}
        className="country-flag-img"
        decoding="async"
        height={dimensions.height}
        loading="lazy"
        src={src}
        width={dimensions.width}
        onError={(event) => {
          const wrapper = event.currentTarget.parentElement;
          event.currentTarget.remove();
          wrapper?.classList.add("country-flag-fallback");
        }}
      />
    </span>
  );
}

type TeamLabelProps = {
  name: string;
  countryHint?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function TeamLabel({ name, countryHint, size = "sm", className = "" }: TeamLabelProps) {
  const code = resolveCountryCode(countryHint ?? name);

  return (
    <span className={`team-label team-label-${size} ${className}`.trim()}>
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
    <span className={`match-teams-line match-teams-line-${layout} ${className}`.trim()}>
      <TeamLabel name={homeTeam} size={size} />
      {hasScore ? <span className="match-score-pill">{homeScore}–{awayScore}</span> : null}
      <TeamLabel name={awayTeam} size={size} />
    </span>
  );
}
