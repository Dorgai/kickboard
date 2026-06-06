"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConnectionPeerPresence } from "@/lib/connections/presence";
import { CONNECTIONS_CHANGED_EVENT } from "@/lib/social/events";

const PRESENCE_POLL_MS = 45_000;

type ConnectionsPresencePayload = {
  peers?: ConnectionPeerPresence[];
  onlineCount?: number;
};

export function useConnectionsPresence(enabled = true) {
  const [presenceByPeerId, setPresenceByPeerId] = useState<Record<string, ConnectionPeerPresence>>({});
  const [onlineCount, setOnlineCount] = useState(0);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/connections/presence", { cache: "no-store" });
    if (!response.ok) return;

    const payload = (await response.json()) as ConnectionsPresencePayload;
    const peers = payload.peers ?? [];
    setPresenceByPeerId(Object.fromEntries(peers.map((peer) => [peer.peerId, peer])));
    setOnlineCount(payload.onlineCount ?? peers.filter((peer) => peer.online).length);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, PRESENCE_POLL_MS);

    function onConnectionsChanged() {
      void refresh();
    }
    window.addEventListener(CONNECTIONS_CHANGED_EVENT, onConnectionsChanged);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener(CONNECTIONS_CHANGED_EVENT, onConnectionsChanged);
    };
  }, [enabled, refresh]);

  return { presenceByPeerId, onlineCount, refresh };
}
