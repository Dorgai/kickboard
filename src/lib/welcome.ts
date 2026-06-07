export const WELCOME_LAST_DISMISSED_KEY = "kickboard-welcome-last-dismissed";
/** @deprecated Migrated to daily dismiss date — cleared on read/write. */
export const WELCOME_STORAGE_KEY = "kickboard-welcome-seen";
export const WELCOME_STORAGE_VERSION = "1";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readLastDismissedDate(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const daily = localStorage.getItem(WELCOME_LAST_DISMISSED_KEY);
    if (daily) return daily;
    if (localStorage.getItem(WELCOME_STORAGE_KEY) === WELCOME_STORAGE_VERSION) {
      localStorage.removeItem(WELCOME_STORAGE_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
  return null;
}

/** True after the user dismisses welcome for the current local calendar day. */
export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return readLastDismissedDate() === localDateKey();
}

export function markWelcomeSeen() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_LAST_DISMISSED_KEY, localDateKey());
    localStorage.removeItem(WELCOME_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
