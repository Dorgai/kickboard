import { query } from "@/lib/db";
import { notifyUserPush } from "@/lib/push/send";

async function userDisplayLabel(userId: string) {
  const result = await query<{ username: string; display_name: string | null }>(
    `SELECT username, display_name FROM users WHERE id = $1`,
    [userId]
  );
  const row = result.rows[0];
  if (!row) return "Someone";
  return row.display_name?.trim() || row.username;
}

export function notifyIncomingConnectionRequest(addresseeId: string, requesterId: string) {
  void userDisplayLabel(requesterId).then((name) => {
    notifyUserPush(addresseeId, {
      title: "New connection request",
      body: `${name} wants to connect on MyPicks.`,
      url: "/#community",
      tag: `connection:request:${requesterId}`
    });
  });
}

export function notifyConnectionAccepted(requesterId: string, addresseeId: string) {
  void userDisplayLabel(addresseeId).then((name) => {
    notifyUserPush(requesterId, {
      title: "Connection accepted",
      body: `${name} accepted your connection request.`,
      url: "/#community",
      tag: `connection:accepted:${addresseeId}`
    });
  });
}

