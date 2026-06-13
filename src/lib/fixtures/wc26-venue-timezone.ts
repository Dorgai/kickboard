/** Format like Wikipedia links: UTC−4, UTC−7 */
export function formatUtcOffsetLabel(offsetHours: number) {
  const sign = offsetHours <= 0 ? "−" : "+";
  const magnitude = Math.abs(offsetHours);
  return `UTC${sign}${magnitude}`;
}

/**
 * Infer standard June offset (hours from UTC) for WC26 host venues scraped from Wikipedia.
 * Wikipedia footballbox kickoff times are local to the stadium, not UTC.
 */
export function inferUtcOffsetHoursFromVenue(venueText: string | null | undefined): number | null {
  const text = venueText?.trim().toLowerCase();
  if (!text) return null;

  // Mexico (no DST)
  if (
    /\bmexico\b|guadalajara|monterrey|zapopan|mexico city|estadio|azteca|akron|bbva/i.test(text)
  ) {
    return -6;
  }

  // Canada
  if (/vancouver|british columbia|bc place/i.test(text)) return -7;
  if (/toronto|ontario|bmo field|montreal|quebec/i.test(text)) return -4;

  // US Pacific
  if (
    /california|washington|oregon|los angeles|seattle|santa clara|inglewood|pasadena|sofi|levis|lumen/i.test(
      text
    )
  ) {
    return -7;
  }

  // US Mountain (Arizona does not observe DST)
  if (/arizona|phoenix|glendale|state farm stadium/i.test(text)) return -7;
  if (/colorado|utah|denver/i.test(text)) return -6;

  // US Central
  if (
    /texas|illinois|chicago|dallas|houston|arlington|att stadium|kansas city|missouri|minnesota|nashville|tennessee/i.test(
      text
    )
  ) {
    return -5;
  }

  // US Eastern (most common WC26 US venue zone)
  if (
    /new jersey|new york|pennsylvania|philadelphia|miami|florida|atlanta|georgia|charlotte|north carolina|boston|massachusetts|east rutherford|metlife|gillette|foxborough|landover|maryland|washington, d\.?c|orlando|tampa/i.test(
      text
    )
  ) {
    return -4;
  }

  return null;
}
