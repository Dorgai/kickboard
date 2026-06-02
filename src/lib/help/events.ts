export const OPEN_WELCOME_EVENT = "kickboard:open-welcome";
export const OPEN_HELP_CENTER_EVENT = "kickboard:open-help-center";

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
