/** Marks share_picks feature as used so onboarding tips skip sharing prompts. */
export function recordPredictionShared() {
  if (typeof window === "undefined") return;
  void fetch("/api/activity/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      eventType: "prediction_shared",
      summary: "Shared a prediction"
    })
  }).catch(() => undefined);
}
