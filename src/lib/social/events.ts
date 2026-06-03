export const CONNECTIONS_CHANGED_EVENT = "kickboard:connections-changed";

export function notifyConnectionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CONNECTIONS_CHANGED_EVENT));
}
