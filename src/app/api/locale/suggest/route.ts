import { NextResponse } from "next/server";
import { detectAppLocale } from "@/lib/i18n/detect";
import { readLocaleCookieServer } from "@/lib/i18n/server-cookie";
import { countryCodeFromRequest } from "@/lib/i18n/request-country";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cookieLocale = await readLocaleCookieServer();
  if (cookieLocale) {
    return NextResponse.json({ locale: cookieLocale, source: "cookie" });
  }

  const locale = detectAppLocale({
    acceptLanguage: request.headers.get("accept-language"),
    countryCode: countryCodeFromRequest(request)
  });

  return NextResponse.json({ locale, source: "detect" });
}
