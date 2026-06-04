"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { PREDICTION_ACTIVITY_EVENT } from "@/lib/fixture-predictions/activity-events";

type PredictionEvent = {
  id: string;
  userId: string;
  fixtureKey: string;
  action: "created" | "updated" | "deleted";
  summary: string;
  createdAt: string;
  username?: string;
  displayName?: string | null;
};

type ConnectionEvent = {
  id: string;
  eventType: string;
  summary: string;
  createdAt: string;
  userId: string;
  username: string;
  displayName: string | null;
};

type TimelineEntry =
  | { kind: "prediction"; id: string; at: string; node: PredictionEvent }
  | { kind: "connection"; id: string; at: string; node: ConnectionEvent };

function peerName(displayName: string | null | undefined, username: string) {
  return displayName?.trim() || `@${username}`;
}

function predictionHeadline(event: PredictionEvent) {
  const name = peerName(event.displayName, event.username ?? "fan");
  if (event.action === "deleted") return `${name} removed picks`;
  if (event.action === "created") return `${name} added picks`;
  return `${name} changed picks`;
}

export function ConnectionActivityTimeline({ refreshToken = 0 }: { refreshToken?: number }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/connections/activity?limit=60", { cache: "no-store" });
      if (!response.ok) {
        setEntries([]);
        return;
      }
      const payload = (await response.json()) as {
        predictionEvents?: PredictionEvent[];
        connectionEvents?: ConnectionEvent[];
      };

      const merged: TimelineEntry[] = [
        ...(payload.predictionEvents ?? []).map((node) => ({
          kind: "prediction" as const,
          id: `p-${node.id}`,
          at: node.createdAt,
          node
        })),
        ...(payload.connectionEvents ?? []).map((node) => ({
          kind: "connection" as const,
          id: `c-${node.id}`,
          at: node.createdAt,
          node
        }))
      ];

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setEntries(merged.slice(0, 50));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  useEffect(() => {
    function onActivity() {
      void load();
    }
    window.addEventListener(PREDICTION_ACTIVITY_EVENT, onActivity);
    const interval = window.setInterval(() => void load(), 45_000);
    return () => {
      window.removeEventListener(PREDICTION_ACTIVITY_EVENT, onActivity);
      window.clearInterval(interval);
    };
  }, [load]);

  return (
    <section className="connection-activity-timeline data-card surface-muted" aria-label="Connection moves">
      <header className="connection-activity-timeline-header">
        <h3 className="panel-help-row">
          Connection moves
          <HelpTooltip label="Connection moves feed" size="sm">
            Pick changes from your connections appear here when they save, update, or remove
            predictions.
          </HelpTooltip>
        </h3>
      </header>

      {loading ? <p className="inline-status">Loading timeline…</p> : null}
      {!loading && entries.length === 0 ? (
        <p className="inline-status">No recent connection activity yet.</p>
      ) : null}

      {!loading && entries.length > 0 ? (
        <ol className="connection-activity-timeline-list">
          {entries.map((entry) => (
            <li className="connection-activity-timeline-item" key={entry.id}>
              <span className="connection-activity-timeline-node" aria-hidden />
              <div className="connection-activity-timeline-body">
                {entry.kind === "prediction" ? (
                  <>
                    <strong>{predictionHeadline(entry.node)}</strong>
                    <p>{entry.node.summary}</p>
                  </>
                ) : (
                  <>
                    <strong>{peerName(entry.node.displayName, entry.node.username)}</strong>
                    <p>{entry.node.summary}</p>
                  </>
                )}
                <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
