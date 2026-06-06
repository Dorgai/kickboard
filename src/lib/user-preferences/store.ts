import { query } from "@/lib/db";
import type { ThemeMode } from "@/lib/theme";

export type DisplayMode = "auto" | "light" | "dark";

export function themeModeToDisplayMode(mode: ThemeMode): DisplayMode {
  if (mode === "system") return "auto";
  return mode;
}

export function displayModeToThemeMode(mode: DisplayMode): ThemeMode {
  if (mode === "auto") return "system";
  return mode;
}

export async function getUserDisplayMode(userId: string): Promise<DisplayMode | null> {
  const result = await query<{ display_mode: DisplayMode }>(
    `SELECT display_mode FROM user_preferences WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0]?.display_mode ?? null;
}

export async function setUserDisplayMode(userId: string, mode: DisplayMode) {
  await query(
    `INSERT INTO user_preferences (user_id, display_mode)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET display_mode = EXCLUDED.display_mode, updated_at = now()`,
    [userId, mode]
  );
}
