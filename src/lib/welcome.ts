export const WELCOME_STORAGE_KEY = "kickboard-welcome-seen";
export const WELCOME_STORAGE_VERSION = "1";

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === WELCOME_STORAGE_VERSION;
  } catch {
    return true;
  }
}

export function markWelcomeSeen() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, WELCOME_STORAGE_VERSION);
  } catch {
    /* ignore quota / private mode */
  }
}
