const LOGIN_CELEBRATE_KEY = "kickboard-login-celebrate";

/** Set before OAuth redirect so celebration runs after the callback reload. */
export function markPendingLoginCelebration() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(LOGIN_CELEBRATE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function consumePendingLoginCelebration() {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(LOGIN_CELEBRATE_KEY) !== "1") return false;
    sessionStorage.removeItem(LOGIN_CELEBRATE_KEY);
    return true;
  } catch {
    return false;
  }
}
