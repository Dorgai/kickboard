import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserLocale, updateUserLocale } from "@/lib/auth/users";
import { isAppLocale } from "@/lib/i18n/locales";
import { LOCALE_COOKIE } from "@/lib/i18n/locales";

export const dynamic = "force-dynamic";

function localeCookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const locale = await getUserLocale(session.user.id);
  return NextResponse.json({ locale: locale ?? "en" });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json()) as { locale?: string };
  if (!isAppLocale(body.locale)) {
    return NextResponse.json({ error: "Invalid locale." }, { status: 400 });
  }

  const updated = await updateUserLocale(session.user.id, body.locale);
  if (!updated) {
    return NextResponse.json({ error: "Unable to update locale." }, { status: 500 });
  }

  const response = NextResponse.json({ locale: updated });
  response.cookies.set(LOCALE_COOKIE, updated, localeCookieOptions());
  return response;
}
