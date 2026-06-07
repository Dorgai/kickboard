const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "x-country-code",
  "x-appengine-country",
  "cloudfront-viewer-country"
] as const;

/** Best-effort ISO 3166-1 alpha-2 from common edge/proxy headers. */
export function countryCodeFromRequest(request: Request): string | null {
  for (const header of COUNTRY_HEADERS) {
    const value = request.headers.get(header)?.trim().toUpperCase();
    if (value && /^[A-Z]{2}$/.test(value)) return value;
  }
  return null;
}
