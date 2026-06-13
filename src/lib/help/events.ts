export const OPEN_WELCOME_EVENT = "kickboard:open-welcome";
export const OPEN_HELP_CENTER_EVENT = "kickboard:open-help-center";
export const OPEN_TOURNAMENT_SUMMARY_EVENT = "kickboard:open-tournament-summary";
export const OPEN_FAN_CHAT_EVENT = "kickboard:open-fan-chat";

export type HelpCenterOpenDetail = {
  channel?: "ai" | "admin";
};

export function requestWelcomeDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_WELCOME_EVENT));
}

export function requestHelpCenter(detail?: HelpCenterOpenDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_HELP_CENTER_EVENT, { detail }));
}

export function requestTournamentSummary() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_TOURNAMENT_SUMMARY_EVENT));
}

export function requestFanChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_FAN_CHAT_EVENT));
}
