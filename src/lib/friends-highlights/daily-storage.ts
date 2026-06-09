export const FRIENDS_HIGHLIGHTS_SHOWN_KEY = "kickboard-friends-highlights-shown:v1";
export const FRIENDS_HIGHLIGHTS_CLOSE_EVENT = "kickboard:friends-highlights-close";
export const FRIENDS_HIGHLIGHTS_VISIBLE_MS = 10_000;
export const FRIENDS_HIGHLIGHTS_BLOW_UP_MS = 820;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type StoredState = {
  userId: string;
  day: string;
};

function readStored(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FRIENDS_HIGHLIGHTS_SHOWN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed?.userId || !parsed?.day) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** True after the friends highlights popup was shown for this user on the current local day. */
export function hasSeenFriendsHighlightsToday(userId: string): boolean {
  if (typeof window === "undefined") return true;
  const stored = readStored();
  return stored?.userId === userId && stored.day === localDateKey();
}

export function markFriendsHighlightsShown(userId: string) {
  if (typeof window === "undefined") return;
  try {
    const state: StoredState = { userId, day: localDateKey() };
    localStorage.setItem(FRIENDS_HIGHLIGHTS_SHOWN_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(new Event(FRIENDS_HIGHLIGHTS_CLOSE_EVENT));
}
