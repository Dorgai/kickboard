import type { CSSProperties } from "react";
import { resolveCountryCode } from "@/lib/country-flags";

export type TeamKitColors = {
  primary: string;
  secondary: string;
  text: string;
};

/** Typical national kit colours (primary shirt, accent/border, readable label). */
const KIT_BY_CODE: Record<string, TeamKitColors> = {
  AR: { primary: "#75AADB", secondary: "#FFFFFF", text: "#0B1F3A" },
  AU: { primary: "#FFD100", secondary: "#00843D", text: "#1B1B1B" },
  AT: { primary: "#FFFFFF", secondary: "#ED2939", text: "#1B1B1B" },
  BE: { primary: "#EF3340", secondary: "#FFD90C", text: "#1B1B1B" },
  BR: { primary: "#FFDF00", secondary: "#009739", text: "#002776" },
  CA: { primary: "#FF0000", secondary: "#FFFFFF", text: "#1B1B1B" },
  CL: { primary: "#D52B1E", secondary: "#0039A6", text: "#FFFFFF" },
  CN: { primary: "#DE2910", secondary: "#FFDE00", text: "#FFFFFF" },
  CO: { primary: "#FCD116", secondary: "#003893", text: "#1B1B1B" },
  CR: { primary: "#002B7F", secondary: "#CE1126", text: "#FFFFFF" },
  HR: { primary: "#FF0000", secondary: "#FFFFFF", text: "#1B1B1B" },
  CU: { primary: "#002A8F", secondary: "#FFFFFF", text: "#FFFFFF" },
  CZ: { primary: "#11457E", secondary: "#D7141A", text: "#FFFFFF" },
  DK: { primary: "#C60C30", secondary: "#FFFFFF", text: "#FFFFFF" },
  EC: { primary: "#FFD100", secondary: "#0033A0", text: "#1B1B1B" },
  EG: { primary: "#CE1126", secondary: "#FFFFFF", text: "#FFFFFF" },
  ENG: { primary: "#FFFFFF", secondary: "#CE1124", text: "#1B1B1B" },
  "GB-ENG": { primary: "#FFFFFF", secondary: "#CE1124", text: "#1B1B1B" },
  ES: { primary: "#AA151B", secondary: "#F1BF00", text: "#FFFFFF" },
  FR: { primary: "#0055A4", secondary: "#EF4135", text: "#FFFFFF" },
  DE: { primary: "#FFFFFF", secondary: "#000000", text: "#1B1B1B" },
  GH: { primary: "#EF3340", secondary: "#FFD90C", text: "#1B1B1B" },
  GR: { primary: "#0D5EAF", secondary: "#FFFFFF", text: "#FFFFFF" },
  HN: { primary: "#FFFFFF", secondary: "#0073CF", text: "#1B1B1B" },
  IR: { primary: "#FFFFFF", secondary: "#239F40", text: "#1B1B1B" },
  IT: { primary: "#009246", secondary: "#CE2B37", text: "#FFFFFF" },
  CI: { primary: "#FF8200", secondary: "#009E60", text: "#1B1B1B" },
  JP: { primary: "#FFFFFF", secondary: "#BC002D", text: "#1B1B1B" },
  KR: { primary: "#FFFFFF", secondary: "#CD2E3A", text: "#1B1B1B" },
  MX: { primary: "#006341", secondary: "#CE1126", text: "#FFFFFF" },
  MA: { primary: "#C1272D", secondary: "#006233", text: "#FFFFFF" },
  NL: { primary: "#FF6600", secondary: "#21468B", text: "#1B1B1B" },
  NZ: { primary: "#FFFFFF", secondary: "#000000", text: "#1B1B1B" },
  NG: { primary: "#008751", secondary: "#FFFFFF", text: "#FFFFFF" },
  "GB-NIR": { primary: "#FFFFFF", secondary: "#009639", text: "#1B1B1B" },
  NO: { primary: "#EF2B2D", secondary: "#002868", text: "#FFFFFF" },
  PL: { primary: "#FFFFFF", secondary: "#DC143C", text: "#1B1B1B" },
  PT: { primary: "#FF0000", secondary: "#006600", text: "#FFFFFF" },
  QA: { primary: "#8A1538", secondary: "#FFFFFF", text: "#FFFFFF" },
  RO: { primary: "#FCD116", secondary: "#002B7F", text: "#1B1B1B" },
  RU: { primary: "#FFFFFF", secondary: "#0039A6", text: "#1B1B1B" },
  SA: { primary: "#006C35", secondary: "#FFFFFF", text: "#FFFFFF" },
  "GB-SCT": { primary: "#005EB8", secondary: "#FFFFFF", text: "#FFFFFF" },
  SN: { primary: "#FFFFFF", secondary: "#00853F", text: "#1B1B1B" },
  RS: { primary: "#C6363C", secondary: "#0C4076", text: "#FFFFFF" },
  SK: { primary: "#FFFFFF", secondary: "#0B4EA2", text: "#1B1B1B" },
  ZA: { primary: "#FFB81C", secondary: "#007749", text: "#1B1B1B" },
  CH: { primary: "#FF0000", secondary: "#FFFFFF", text: "#FFFFFF" },
  TN: { primary: "#FFFFFF", secondary: "#E70013", text: "#1B1B1B" },
  TR: { primary: "#E30A17", secondary: "#FFFFFF", text: "#FFFFFF" },
  UA: { primary: "#FFD500", secondary: "#005BBB", text: "#1B1B1B" },
  US: { primary: "#FFFFFF", secondary: "#BF0A30", text: "#002868" },
  UY: { primary: "#FFFFFF", secondary: "#0038A8", text: "#1B1B1B" },
  VE: { primary: "#FFCC00", secondary: "#CF142B", text: "#1B1B1B" },
  "GB-WLS": { primary: "#FFFFFF", secondary: "#D30731", text: "#1B1B1B" },
  ZM: { primary: "#198A00", secondary: "#EF7D00", text: "#FFFFFF" }
};

const SIDE_FALLBACK: Record<"home" | "away", TeamKitColors> = {
  home: { primary: "#6366F1", secondary: "#A855F7", text: "#FFFFFF" },
  away: { primary: "#F43F5E", secondary: "#FB923C", text: "#FFFFFF" }
};

function hexLuminance(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return 0.5;
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function pickTextColor(primary: string, secondary: string) {
  return hexLuminance(primary) > 0.62 ? "#111827" : "#FFFFFF";
}

function kitFromCode(code: string): TeamKitColors | null {
  if (KIT_BY_CODE[code]) return KIT_BY_CODE[code];
  const sub = code.includes("-") ? code.split("-").pop() : null;
  if (sub && KIT_BY_CODE[sub]) return KIT_BY_CODE[sub];
  if (code.startsWith("GB-") && KIT_BY_CODE[code]) return KIT_BY_CODE[code];
  return null;
}

export function getTeamKitColors(teamName: string, side: "home" | "away" = "home"): TeamKitColors {
  const code = resolveCountryCode(teamName);
  if (code) {
    const kit = kitFromCode(code);
    if (kit) {
      return {
        ...kit,
        text: kit.text || pickTextColor(kit.primary, kit.secondary)
      };
    }
  }

  return SIDE_FALLBACK[side];
}

export function teamKitInlineStyle(
  teamName: string,
  side: "home" | "away"
): CSSProperties {
  const kit = getTeamKitColors(teamName, side);
  return {
    ["--pitch-kit-primary" as string]: kit.primary,
    ["--pitch-kit-secondary" as string]: kit.secondary,
    ["--pitch-kit-text" as string]: kit.text,
    ["--pitch-kit-glow" as string]: kit.secondary
  };
}
