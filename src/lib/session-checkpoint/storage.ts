export const SESSION_CHECKPOINT_DISMISSED_AT_KEY = "kickboard-session-checkpoint-dismissed-at";
export const SESSION_CHECKPOINT_INTERVAL_MS = 2 * 60 * 60 * 1000;

export function getCheckpointDismissedAt(): number {
  if (typeof window === "undefined") return Date.now();
  try {
    const raw = localStorage.getItem(SESSION_CHECKPOINT_DISMISSED_AT_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

export function markCheckpointDismissed() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_CHECKPOINT_DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function isCheckpointIntervalElapsed(now = Date.now()) {
  return now - getCheckpointDismissedAt() >= SESSION_CHECKPOINT_INTERVAL_MS;
}
