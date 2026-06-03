const SNAPSHOT_KEY = "kickboard-prediction-status-snapshot";

export function loadPredictionStatusSnapshot(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, string>;
  } catch {
    return null;
  }
}

export function savePredictionStatusSnapshot(snapshot: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota */
  }
}
