"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { ConnectionActivityTimeline } from "@/components/connection-activity-timeline";
import { RegistrationInvitationsPanel } from "@/components/registration-invitations-panel";
import { PanelHelpRow } from "@/components/help-tooltip";
import { notifyConnectionsChanged } from "@/lib/social/events";

type PublicUserCard = {
  id: string;
  username: string;
  displayName: string | null;
  pointsBalance: number;
};

type ConnectionRow = {
  id: string;
  status: string;
  createdAt: string;
  direction: "incoming" | "outgoing";
  peer: PublicUserCard;
};

type ConnectionsPayload = {
  accepted: ConnectionRow[];
  pendingIncoming: ConnectionRow[];
  pendingOutgoing: ConnectionRow[];
};

export function CommunityConnectionsPanel() {
  return (
    <AuthGate featureLabel="Community connections">
      <ConnectionsPanelInner />
    </AuthGate>
  );
}

function ConnectionsPanelInner() {
  const [data, setData] = useState<ConnectionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUserCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [connectUsername, setConnectUsername] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      if (!response.ok) {
        setData(null);
        return;
      }
      setData((await response.json()) as ConnectionsPayload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: term });
        const response = await fetch(`/api/users/search?${params}`);
        const payload = (await response.json()) as { users?: PublicUserCard[] };
        if (!cancelled) setSearchResults(payload.users ?? []);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  async function sendRequest(username: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username })
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to connect.");
      setNotice(payload.message ?? "Request sent.");
      setConnectUsername("");
      setSearchQuery("");
      await refresh();
      notifyConnectionsChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConnectSubmit(event: FormEvent) {
    event.preventDefault();
    await sendRequest(connectUsername);
  }

  async function handleConnectionAction(connectionId: string, action: "accept" | "reject" | "block") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update request.");
      setNotice(action === "accept" ? "Connected." : "Request updated.");
      await refresh();
      notifyConnectionsChanged();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to update request.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelRequest(connectionId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/connections/${connectionId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to cancel.");
      await refresh();
      notifyConnectionsChanged();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="community-connections-panel">
      <RegistrationInvitationsPanel />

      <PanelHelpRow
        className="panel-help-row--block community-panel-help"
        help={
          <>
            Connect with other registered fans. Once you accept each other, you can see their Coach
            Board squads and score picks for the same match — free-to-play predictions, not
            real-money betting.
          </>
        }
        helpLabel="About connections"
        title="Connections"
        titleClassName="community-panel-help-title"
      />

      <ConnectionActivityTimeline />

      <form className="connections-connect-form" onSubmit={handleConnectSubmit}>
        <label className="feed-control-field">
          Connect by username
          <input
            className="feed-control-input"
            placeholder="Search or type @username"
            value={connectUsername || searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setConnectUsername(event.target.value.replace(/^@/, ""));
            }}
          />
        </label>
        <button className="button primary" disabled={busy || connectUsername.trim().length < 3} type="submit">
          Send request
        </button>
      </form>

      {searching ? <p className="inline-status">Searching…</p> : null}
      {searchResults.length > 0 ? (
        <ul className="connections-search-results">
          {searchResults.map((user) => (
            <li key={user.id}>
              <div className="connections-search-card">
                <span>
                  <strong>{user.displayName ?? user.username}</strong>
                  <span className="connections-search-username">@{user.username}</span>
                </span>
                <button
                  className="button secondary"
                  disabled={busy}
                  type="button"
                  onClick={() => void sendRequest(user.username)}
                >
                  Connect
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {loading ? <p className="inline-status">Loading connections…</p> : null}

      {!loading && data?.pendingIncoming.length ? (
        <section className="connections-section">
          <h3>Requests for you</h3>
          <ul className="connections-list">
            {data.pendingIncoming.map((row) => (
              <li key={row.id}>
                <ConnectionCard
                  busy={busy}
                  row={row}
                  onAccept={() => void handleConnectionAction(row.id, "accept")}
                  onReject={() => void handleConnectionAction(row.id, "reject")}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading && data?.pendingOutgoing.length ? (
        <section className="connections-section">
          <h3>Pending sent</h3>
          <ul className="connections-list">
            {data.pendingOutgoing.map((row) => (
              <li key={row.id}>
                <div className="connections-card">
                  <PeerLabel peer={row.peer} />
                  <button
                    className="button secondary"
                    disabled={busy}
                    type="button"
                    onClick={() => void cancelRequest(row.id)}
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading ? (
        <section className="connections-section">
          <h3>Connected ({data?.accepted.length ?? 0})</h3>
          {!data?.accepted.length ? (
            <p className="inline-status">No connections yet. Send a request to get started.</p>
          ) : (
            <ul className="connections-list">
              {data.accepted.map((row) => (
                <li key={row.id}>
                  <div className="connections-card connections-card--accepted">
                    <PeerLabel peer={row.peer} />
                    <span className="connections-points">{row.peer.pointsBalance} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {notice ? <p className="inline-status community-notice">{notice}</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
    </div>
  );
}

function PeerLabel({ peer }: { peer: PublicUserCard }) {
  return (
    <span className="connections-peer">
      <strong>{peer.displayName ?? peer.username}</strong>
      <span className="connections-search-username">@{peer.username}</span>
    </span>
  );
}

function ConnectionCard({
  row,
  busy,
  onAccept,
  onReject
}: {
  row: ConnectionRow;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="connections-card">
      <PeerLabel peer={row.peer} />
      <div className="connections-card-actions">
        <button className="button primary" disabled={busy} type="button" onClick={onAccept}>
          Accept
        </button>
        <button className="button secondary" disabled={busy} type="button" onClick={onReject}>
          Decline
        </button>
      </div>
    </div>
  );
}
