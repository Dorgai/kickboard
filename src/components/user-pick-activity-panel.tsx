"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";

type PickEvent = {
  id: string;
  fixtureKey: string;
  action: "created" | "updated" | "deleted";
  summary: string;
  createdAt: string;
};

function actionLabel(action: PickEvent["action"]) {
  if (action === "created") return "Saved";
  if (action === "updated") return "Updated";
  return "Removed";
}

export function UserPickActivityPanel({ refreshToken = 0 }: { refreshToken?: number }) {
  const [events, setEvents] = useState<PickEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/fixture-predictions/activity?limit=30", {
        cache: "no-store"
      });
      if (!response.ok) {
        setEvents([]);
        return;
      }
      const payload = (await response.json()) as { events?: PickEvent[] };
      setEvents(payload.events ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return (
    <details className="user-pick-activity user-pick-activity-disclosure data-card surface-muted">
      <summary className="user-pick-activity-toggle">
        <span className="user-pick-activity-header panel-help-row">
          <span className="user-pick-activity-title">Your pick history</span>
          <HelpTooltip
            label="Pick history"
            size="sm"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Every save, change, or removal is logged here. Connections see updates in their timeline
            and alerts.
          </HelpTooltip>
          {!loading ? (
            <span className="user-pick-activity-count">{events.length}</span>
          ) : null}
        </span>
        <span aria-hidden className="user-pick-activity-chevron" />
      </summary>

      <div className="user-pick-activity-body">
        {loading ? <p className="inline-status">Loading history…</p> : null}
        {!loading && events.length === 0 ? (
          <p className="inline-status">No logged pick changes yet.</p>
        ) : null}

        {!loading && events.length > 0 ? (
          <ul className="user-pick-activity-list">
            {events.map((event) => (
              <li
                className={`user-pick-activity-item user-pick-activity-item--${event.action}`}
                key={event.id}
              >
                <span className={`user-pick-activity-badge user-pick-activity-badge--${event.action}`}>
                  {actionLabel(event.action)}
                </span>
                <p className="user-pick-activity-summary">{event.summary}</p>
                <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
