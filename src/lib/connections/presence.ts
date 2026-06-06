import { getPresenceForUserIds } from "@/lib/activity/store";
import { listAcceptedPeerIds } from "@/lib/connections/store";

export type ConnectionPeerPresence = {
  peerId: string;
  online: boolean;
  lastSeenAt: string | null;
};

export async function listAcceptedConnectionsPresence(
  viewerId: string
): Promise<ConnectionPeerPresence[]> {
  const peerIds = await listAcceptedPeerIds(viewerId);
  const snapshots = await getPresenceForUserIds(peerIds);

  return snapshots.map((snapshot) => ({
    peerId: snapshot.userId,
    online: snapshot.online,
    lastSeenAt: snapshot.lastSeenAt
  }));
}
