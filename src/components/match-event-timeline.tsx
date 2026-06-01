"use client";

import { useEffect, useMemo, useState } from "react";
import { TeamLabel } from "@/components/team-label";

type TimelineEvent = {
  id: string;
  minute: number;
  second: number;
  type: string;
  team: string | null;
  player: string | null;
  description: string;
  tone: "goal" | "danger" | "neutral";
  highlight: boolean;
};

type EventsResponse = {
  connected: boolean;
  matchId: number;
  count: number;
  eventTypeCounts: Record<string, number>;
  events: TimelineEvent[];
  error?: string;
};

type MatchEventTimelineProps = {
  matchId: number;
  enabled?: boolean;
  inModal?: boolean;
};

export function MatchEventTimeline({
  matchId,
  enabled = true,
  inModal = false
}: MatchEventTimelineProps) {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const response = await fetch(`/api/feeds/historical/events?matchId=${matchId}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as EventsResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load match events");
        }

        if (!cancelled) setData(payload);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown events load error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [enabled, matchId]);

  const visibleEvents = useMemo(() => {
    if (!data?.events.length) return [];
    const sorted = [...data.events].sort((left, right) => {
      if (left.minute !== right.minute) return left.minute - right.minute;
      return left.second - right.second;
    });
    if (showAll) return sorted;
    return sorted.filter((event) => event.highlight);
  }, [data?.events, showAll]);

  const topTypes = useMemo(() => {
    if (!data?.eventTypeCounts) return [];
    return Object.entries(data.eventTypeCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 8);
  }, [data?.eventTypeCounts]);

  if (loading) {
    return <p className="inline-status">Loading event timeline…</p>;
  }

  if (error) {
    return <p className="inline-error">{error}</p>;
  }

  if (!data?.connected) {
    return <p className="inline-status">Event timeline unavailable for this match.</p>;
  }

  const Tag = inModal ? "div" : "section";

  return (
    <Tag className={`match-detail-section match-event-timeline${inModal ? " match-event-timeline--modal" : ""}`}>
      {!inModal ? (
        <div className="section-heading compact">
          <div>
            <h3>Event timeline</h3>
            <p className="match-timeline-summary">
              {data.count} events in feed · showing {visibleEvents.length}
              {showAll ? "" : " key moments"}
            </p>
          </div>
          <button className="text-button" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Key moments only" : "Show all events"}
          </button>
        </div>
      ) : (
        <div className="section-heading compact">
          <p className="match-timeline-summary">
            {data.count} events in feed · showing {visibleEvents.length}
            {showAll ? "" : " key moments"}
          </p>
          <button className="text-button" type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? "Key moments only" : "Show all events"}
          </button>
        </div>
      )}

      {topTypes.length ? (
        <div className="event-type-chips" aria-label="Event type breakdown">
          {topTypes.map(([type, count]) => (
            <span className="event-type-chip" key={type}>
              {type} <strong>{count}</strong>
            </span>
          ))}
        </div>
      ) : null}

      {visibleEvents.length ? (
        <ol className={`timeline match-timeline-list${inModal ? " match-timeline-list--modal" : ""}`}>
          {visibleEvents.map((event) => (
            <li className="timeline-item" data-tone={event.tone} key={event.id}>
              <span>
                {event.minute}&apos;{String(event.second).padStart(2, "0")}
              </span>
              <div>
                <p>{event.description}</p>
                {event.team ? (
                  <p className="match-timeline-meta">
                    <TeamLabel name={event.team} size="xs" />
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="inline-status">No highlighted events for this filter.</p>
      )}
    </Tag>
  );
}
