"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { ConnectionActivityTimeline } from "@/components/connection-activity-timeline";
import { RegistrationInvitationsPanel } from "@/components/registration-invitations-panel";
import { ConnectionOnlineIndicator } from "@/components/connection-online-indicator";
import { PanelHelpRow } from "@/components/help-tooltip";
import { useTranslation } from "@/components/locale-provider";
import { notifyConnectionsChanged } from "@/lib/social/events";
import { useConnectionsPresence } from "@/lib/social/use-connections-presence";

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
  const { t } = useTranslation();

  return (
    <AuthGate featureLabel={t("nav.community")}>
      <ConnectionsPanelInner />
    </AuthGate>
  );
}

function ConnectionsPanelInner() {
  const { t } = useTranslation();
  const [data, setData] = useState<ConnectionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PublicUserCard[]>([]);
  const [discoverableUsers, setDiscoverableUsers] = useState<PublicUserCard[]>([]);
  const [discoverableLoading, setDiscoverableLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [connectUsername, setConnectUsername] = useState("");
  const [profileDiscoverable, setProfileDiscoverable] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { presenceByPeerId, onlineCount } = useConnectionsPresence(!loading);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/connections", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setData(null);
        if (response.status === 403 && payload.error) {
          setError(payload.error);
        } else if (response.status === 401) {
          setError(t("connections.unavailable"));
        }
        return;
      }
      setData(payload as ConnectionsPayload);
    } finally {
      setLoading(false);
    }
  }, [t]);

  const refreshDiscoverable = useCallback(async () => {
    setDiscoverableLoading(true);
    try {
      const response = await fetch("/api/users/discoverable", { cache: "no-store" });
      if (!response.ok) {
        setDiscoverableUsers([]);
        return;
      }
      const payload = (await response.json()) as { users?: PublicUserCard[] };
      setDiscoverableUsers(payload.users ?? []);
    } finally {
      setDiscoverableLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshDiscoverable();
  }, [refresh, refreshDiscoverable]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setVisibilityLoading(true);
      try {
        const response = await fetch("/api/user/profile-discoverable", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { profileDiscoverable?: boolean };
        if (!cancelled && typeof payload.profileDiscoverable === "boolean") {
          setProfileDiscoverable(payload.profileDiscoverable);
        }
      } finally {
        if (!cancelled) setVisibilityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      setNotice(payload.message ?? t("connections.requestSent"));
      setConnectUsername("");
      setSearchQuery("");
      await refresh();
      await refreshDiscoverable();
      notifyConnectionsChanged();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVisibilityChange(next: boolean) {
    setVisibilitySaving(true);
    setError(null);
    try {
      const response = await fetch("/api/user/profile-discoverable", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileDiscoverable: next })
      });
      const payload = (await response.json()) as {
        error?: string;
        profileDiscoverable?: boolean;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to update visibility.");
      setProfileDiscoverable(Boolean(payload.profileDiscoverable));
      if (!payload.profileDiscoverable) {
        await refreshDiscoverable();
      }
    } catch (visibilityError) {
      setError(
        visibilityError instanceof Error ? visibilityError.message : "Unable to update visibility."
      );
    } finally {
      setVisibilitySaving(false);
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
      setNotice(
        action === "accept" ? t("connections.connectedNotice") : t("connections.requestUpdated")
      );
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

  const selectionUsers = searchQuery.trim().length >= 2 ? searchResults : discoverableUsers;
  const showDiscoverableHeading = searchQuery.trim().length < 2;

  return (
    <div className="community-connections-panel">
      <RegistrationInvitationsPanel />

      <section className="profile-visibility-panel">
        <label className="profile-visibility-toggle">
          <input
            checked={profileDiscoverable}
            disabled={visibilityLoading || visibilitySaving}
            type="checkbox"
            onChange={(event) => void handleVisibilityChange(event.target.checked)}
          />
          <span className="profile-visibility-toggle-copy">
            <strong>{t("connections.profileVisible")}</strong>
            <span>{t("connections.profileVisibleHint")}</span>
          </span>
        </label>
        {visibilitySaving ? (
          <p className="inline-status">{t("connections.profileVisibleSaving")}</p>
        ) : null}
        {!visibilityLoading && !profileDiscoverable ? (
          <p className="inline-status profile-visibility-hidden-note">
            {t("connections.profileHiddenNotice")}
          </p>
        ) : null}
      </section>

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
          {t("connections.connectByUsername")}
          <input
            className="feed-control-input"
            placeholder={t("connections.searchPlaceholder")}
            value={connectUsername || searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setConnectUsername(event.target.value.replace(/^@/, ""));
            }}
          />
        </label>
        <button className="button primary" disabled={busy || connectUsername.trim().length < 3} type="submit">
          {t("connections.sendRequest")}
        </button>
      </form>

      {searching || (showDiscoverableHeading && discoverableLoading) ? (
        <p className="inline-status">
          {searching ? t("connections.searching") : t("common.loading")}
        </p>
      ) : null}

      {selectionUsers.length > 0 ? (
        <section className="connections-section">
          {showDiscoverableHeading ? <h3>{t("connections.discoverableFansTitle")}</h3> : null}
          <ul className="connections-search-results">
            {selectionUsers.map((user) => (
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
                    {t("connections.connect")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : showDiscoverableHeading && !discoverableLoading ? (
        <p className="inline-status">{t("connections.discoverableFansEmpty")}</p>
      ) : null}

      {loading ? <p className="inline-status">{t("connections.loading")}</p> : null}

      {!loading && data?.pendingIncoming.length ? (
        <section className="connections-section">
          <h3>{t("connections.requestsForYou")}</h3>
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
          <h3>{t("connections.pendingSent")}</h3>
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
                    {t("connections.cancel")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!loading ? (
        <section className="connections-section">
          <h3 className="connections-section-heading">
            {t("connections.connected", { count: data?.accepted.length ?? 0 })}
            {onlineCount > 0 ? (
              <span className="connections-online-summary">
                {t("connections.onlineSummary", { count: onlineCount })}
              </span>
            ) : null}
          </h3>
          {!data?.accepted.length ? (
            <p className="inline-status">{t("connections.noConnections")}</p>
          ) : (
            <ul className="connections-list">
              {data.accepted.map((row) => (
                <li key={row.id}>
                  <div className="connections-card connections-card--accepted">
                    <PeerLabel
                      online={presenceByPeerId[row.peer.id]?.online ?? false}
                      peer={row.peer}
                    />
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

function PeerLabel({ peer, online = false }: { peer: PublicUserCard; online?: boolean }) {
  return (
    <span className="connections-peer">
      <span className="connections-peer-name-row">
        <ConnectionOnlineIndicator online={online} />
        <strong>{peer.displayName ?? peer.username}</strong>
      </span>
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
  const { t } = useTranslation();

  return (
    <div className="connections-card">
      <PeerLabel peer={row.peer} />
      <div className="connections-card-actions">
        <button className="button primary" disabled={busy} type="button" onClick={onAccept}>
          {t("connections.accept")}
        </button>
        <button className="button secondary" disabled={busy} type="button" onClick={onReject}>
          {t("connections.decline")}
        </button>
      </div>
    </div>
  );
}
