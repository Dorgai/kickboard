const COUNTRY_CODES: Record<string, string> = {
  afghanistan: "AF",
  albania: "AL",
  algeria: "DZ",
  angola: "AO",
  argentina: "AR",
  australia: "AU",
  austria: "AT",
  belgium: "BE",
  bolivia: "BO",
  "bosnia and herzegovina": "BA",
  brazil: "BR",
  bulgaria: "BG",
  cameroon: "CM",
  canada: "CA",
  chile: "CL",
  china: "CN",
  "china pr": "CN",
  colombia: "CO",
  "costa rica": "CR",
  croatia: "HR",
  cuba: "CU",
  "czech republic": "CZ",
  czechia: "CZ",
  denmark: "DK",
  ecuador: "EC",
  egypt: "EG",
  england: "GB-ENG",
  france: "FR",
  germany: "DE",
  "west germany": "DE",
  "soviet union": "RU",
  "fr yugoslavia": "RS",
  ghana: "GH",
  greece: "GR",
  honduras: "HN",
  hungary: "HU",
  iceland: "IS",
  india: "IN",
  iran: "IR",
  iraq: "IQ",
  ireland: "IE",
  "republic of ireland": "IE",
  israel: "IL",
  italy: "IT",
  "cote d'ivoire": "CI",
  "côte d'ivoire": "CI",
  "ivory coast": "CI",
  jamaica: "JM",
  japan: "JP",
  jordan: "JO",
  "korea republic": "KR",
  "south korea": "KR",
  "korea dpr": "KP",
  "north korea": "KP",
  kuwait: "KW",
  mexico: "MX",
  morocco: "MA",
  netherlands: "NL",
  "new zealand": "NZ",
  nigeria: "NG",
  "northern ireland": "GB-NIR",
  norway: "NO",
  panama: "PA",
  paraguay: "PY",
  peru: "PE",
  poland: "PL",
  portugal: "PT",
  qatar: "QA",
  romania: "RO",
  russia: "RU",
  "saudi arabia": "SA",
  scotland: "GB-SCT",
  senegal: "SN",
  serbia: "RS",
  slovakia: "SK",
  slovenia: "SI",
  "south africa": "ZA",
  spain: "ES",
  sweden: "SE",
  switzerland: "CH",
  togo: "TG",
  tunisia: "TN",
  turkey: "TR",
  ukraine: "UA",
  "united arab emirates": "AE",
  "united states": "US",
  usa: "US",
  uruguay: "UY",
  venezuela: "VE",
  wales: "GB-WLS",
  yugoslavia: "RS",
  zaire: "CD",
  "dr congo": "CD"
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function resolveCountryCode(teamOrCountry: string | null | undefined) {
  if (!teamOrCountry) return null;

  const normalized = normalizeKey(teamOrCountry);
  if (COUNTRY_CODES[normalized]) {
    return COUNTRY_CODES[normalized];
  }

  const withoutSuffix = normalized.replace(/\s+(fc|sc|cf)$/u, "");
  if (COUNTRY_CODES[withoutSuffix]) {
    return COUNTRY_CODES[withoutSuffix];
  }

  return null;
}

export function flagImageUrl(code: string, width = 40) {
  const normalized = code.toLowerCase();
  return `https://flagcdn.com/w${width}/${normalized}.png`;
}
