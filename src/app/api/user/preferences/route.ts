import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/require-user";
import { mapDatabaseError } from "@/lib/community/health";
import {
  displayModeToThemeMode,
  getUserDisplayMode,
  setUserDisplayMode,
  themeModeToDisplayMode,
  type DisplayMode
} from "@/lib/user-preferences/store";

export const dynamic = "force-dynamic";

function parseDisplayMode(value: unknown): DisplayMode | null {
  if (value === "auto" || value === "light" || value === "dark") return value;
  return null;
}

export async function GET() {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const displayMode = (await getUserDisplayMode(user.id)) ?? "dark";
    return NextResponse.json({
      displayMode,
      themeMode: displayModeToThemeMode(displayMode)
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to load preferences." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: { displayMode?: unknown; themeMode?: unknown };
  try {
    body = (await request.json()) as { displayMode?: unknown; themeMode?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fromDisplay = parseDisplayMode(body.displayMode);
  const fromTheme =
    body.themeMode === "light" || body.themeMode === "dark" || body.themeMode === "system"
      ? themeModeToDisplayMode(body.themeMode)
      : null;
  const displayMode = fromDisplay ?? fromTheme;
  if (!displayMode) {
    return NextResponse.json({ error: "displayMode or themeMode required." }, { status: 400 });
  }

  try {
    await setUserDisplayMode(user.id, displayMode);
    return NextResponse.json({
      displayMode,
      themeMode: displayModeToThemeMode(displayMode)
    });
  } catch (error) {
    const mapped = mapDatabaseError(error);
    if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    return NextResponse.json({ error: "Unable to save preferences." }, { status: 500 });
  }
}
