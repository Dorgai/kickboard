"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { SquadPitch } from "@/components/squad-pitch";
import type { SquadFormation, SquadLineupSlot } from "@/lib/squads/lineup";

type PeerSquadSummary = {
  id: string;
  name: string;
  formation: string;
  playersPlaced: number;
  updatedAt: string;
};

type PeerMatchActivity = {
  userId: string;
  username: string;
  displayName: string | null;
  squads: PeerSquadSummary[];
  prediction: { homeScore: number; awayScore: number } | null;
};

type FriendsMatchActivityProps = {
  fixtureKey: string;
  homeTeam: string;
  awayTeam: string;
};

export function FriendsMatchActivity({ fixtureKey, homeTeam, awayTeam }: FriendsMatchActivityProps) {
  const [peers, setPeers] = useState<PeerMatchActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSquad, setExpandedSquad] = useState<{
    userId: string;
    squadId: string;
    peerName: string;
  } | null>(null);
  const [expandedLineup, setExpandedLineup] = useState<{
    name: string;
    formation: SquadFormation;
    lineup: SquadLineupSlot[];
  } | null>(null);
  const [loadingSquad, setLoadingSquad] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/peers/match-activity?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as { peers?: PeerMatchActivity[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load friends.");
      setPeers(payload.peers ?? []);
    } catch (loadError) {
      setPeers([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load friends.");
    } finally {
      setLoading(false);
    }
  }, [fixtureKey]);

  useEffect(() => {
    setExpandedSquad(null);
    setExpandedLineup(null);
    void refresh();
  }, [refresh]);

  async function openPeerSquad(userId: string, squadId: string, peerName: string) {
    if (expandedSquad?.squadId === squadId) {
      setExpandedSquad(null);
      setExpandedLineup(null);
      return;
    }

    setExpandedSquad({ userId, squadId, peerName });
    setLoadingSquad(true);
    setExpandedLineup(null);
    try {
      const response = await fetch(`/api/peers/${userId}/squads/${squadId}`, { cache: "no-store" });
      const payload = (await response.json()) as {
        squad?: {
          name: string;
          formation: SquadFormation;
          lineup: SquadLineupSlot[];
        };
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load squad.");
      if (payload.squad) setExpandedLineup(payload.squad);
    } catch {
      setExpandedLineup(null);
    } finally {
      setLoadingSquad(false);
    }
  }

  if (loading) {
    return (
      <section className="friends-match-activity">
        <h3>Connections</h3>
        <p className="inline-status">Loading connected fans for this match…</p>
      </section>
    );
  }

  return (
    <section className="friends-match-activity" aria-label="Connected fans for this match">
      <div className="friends-match-activity-header">
        <h3 className="panel-help-row">
          Connections
          <HelpTooltip label="Connected fans on this match" size="sm">
            Squads and score picks from people you are connected with.{" "}
            <a href="#community">Manage connections</a>
          </HelpTooltip>
        </h3>
      </div>

      {error ? <p className="inline-status">{error}</p> : null}

      {!error && peers.length === 0 ? (
        <p className="inline-status">
          No activity from connections for this match yet. Connect with fans in{" "}
          <a href="#community">Community</a> to compare boards and picks.
        </p>
      ) : null}

      {peers.length > 0 ? (
        <ul className="friends-activity-list">
          {peers.map((peer) => (
            <li className="friends-activity-card" key={peer.userId}>
              <header className="friends-activity-card-header">
                <strong>{peer.displayName ?? peer.username}</strong>
                <span className="connections-search-username">@{peer.username}</span>
                {peer.prediction ? (
                  <span className="friends-activity-pick">
                    Pick: {peer.prediction.homeScore}–{peer.prediction.awayScore}
                  </span>
                ) : (
                  <span className="friends-activity-pick friends-activity-pick--empty">No pick yet</span>
                )}
              </header>

              {peer.squads.length > 0 ? (
                <ul className="friends-activity-squads">
                  {peer.squads.map((squad) => (
                    <li key={squad.id}>
                      <button
                        className={`saved-squad-card friends-squad-btn${
                          expandedSquad?.squadId === squad.id ? " selected" : ""
                        }`}
                        type="button"
                        onClick={() =>
                          void openPeerSquad(
                            peer.userId,
                            squad.id,
                            peer.displayName ?? peer.username
                          )
                        }
                      >
                        <span className="saved-squad-card-name">{squad.name}</span>
                        <span className="saved-squad-card-meta">
                          {squad.formation} · {squad.playersPlaced}/11
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="inline-status">No saved boards for this match.</p>
              )}

              {expandedSquad?.userId === peer.userId && expandedSquad.squadId ? (
                <div className="friends-squad-preview">
                  {loadingSquad ? (
                    <p className="inline-status">Loading {expandedSquad.peerName}&apos;s board…</p>
                  ) : null}
                  {expandedLineup ? (
                    <>
                      <p className="friends-squad-preview-title">
                        {expandedLineup.name} ({expandedLineup.formation})
                      </p>
                      <SquadPitch
                        awayTeam={awayTeam}
                        homeTeam={homeTeam}
                        lineup={expandedLineup.lineup}
                        readOnly
                        selectedSlot={null}
                        onLineupChange={() => undefined}
                        onSelectSlot={() => undefined}
                      />
                    </>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
