import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminAuthStatus } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  const { configured } = getAdminAuthStatus();

  if (!configured) {
    return NextResponse.json({ error: "Admin token is not configured on the server" }, { status: 503 });
  }

  const body = (await request.json()) as { token?: string };
  const token = body.token?.trim();

  if (!token || token !== process.env.ADMIN_DATA_SOURCES_TOKEN) {
    return NextResponse.json({ error: "Invalid admin token" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
