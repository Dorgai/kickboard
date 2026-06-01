"use client";

import { useEffect, useState } from "react";

type FeedStatusPayload = {
  generatedAt: string;
  feeds: {
    historical: {
      name: string;
      connected: boolean;
      mode: string;
      endpoint: string;
    };
    realtime: {
      name: string;
      connected: boolean;
      keyConfigured: boolean;
      workerEnabled: boolean;
      mode: string;
      endpoint: string;
      message: string;
    };
    storage: {
      postgres: boolean;
      redis: boolean;
    };
  };
};

export function FeedStatusPanel() {
  const [status, setStatus] = useState<FeedStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch("/api/feeds/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Unable to load feed status");
        }
        const payload = (await response.json()) as FeedStatusPayload;
        if (!cancelled) setStatus(payload);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown feed status error");
        }
      }
    }

    loadStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="feed-status-panel surface-muted" aria-label="Feed status">
        <p className="inline-error">{error}</p>
      </section>
    );
  }

  if (!status) {
    return (
      <section className="feed-status-panel surface-muted" aria-label="Feed status">
        <p className="inline-status">Checking feed connections…</p>
      </section>
    );
  }

  const { historical, realtime, storage } = status.feeds;

  return (
    <section className="feed-status-panel data-card surface-muted" aria-label="Feed status">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Infrastructure</p>
          <h2>Feed &amp; infrastructure status</h2>
          <p className="feed-status-updated">
            Updated {new Date(status.generatedAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="feed-status-grid">
        <FeedStatusTile
          connected={historical.connected}
          detail={historical.mode}
          href={historical.endpoint}
          label={historical.name}
        />
        <FeedStatusTile
          connected={realtime.connected}
          detail={realtime.message}
          href={realtime.endpoint}
          label={realtime.name}
          meta={`Key ${realtime.keyConfigured ? "set" : "missing"} · Worker ${
            realtime.workerEnabled ? "on" : "off"
          }`}
        />
        <FeedStatusTile
          connected={storage.postgres}
          detail="Schema ready for sync jobs"
          label="PostgreSQL"
        />
        <FeedStatusTile connected={storage.redis} detail="Worker cache and pub/sub" label="Redis" />
      </div>
    </section>
  );
}

function FeedStatusTile({
  label,
  detail,
  meta,
  connected,
  href
}: {
  label: string;
  detail: string;
  meta?: string;
  connected: boolean;
  href?: string;
}) {
  return (
    <article className={`feed-status-tile${connected ? " connected" : ""}`}>
      <span className={`feed-status-dot${connected ? " on" : ""}`} aria-hidden="true" />
      <div>
        <h3>{label}</h3>
        <p>{detail}</p>
        {meta ? <p className="feed-status-meta">{meta}</p> : null}
        {href ? (
          <a className="text-button" href={href}>
            Open endpoint
          </a>
        ) : null}
      </div>
    </article>
  );
}
