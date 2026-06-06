"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserAlert } from "@/lib/alerts/types";
import { useToastOptional } from "@/components/toast-provider";
import {
  useDismissOnEscape,
  useDismissOnOutsidePointerDown
} from "@/lib/use-dismiss-on-outside-pointer-down";

function categoryLabel(category: UserAlert["category"]) {
  if (category === "connection_activity") return "Connection";
  if (category === "match_upcoming") return "Upcoming";
  return "Result";
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsCenter() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const seenAlertKeysRef = useRef<Set<string>>(new Set());
  const alertsSeededRef = useRef(false);
  const toast = useToastOptional();

  const load = useCallback(async () => {
    if (status !== "authenticated") {
      setAlerts([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/alerts", { cache: "no-store" });
      const payload = (await response.json()) as {
        alerts?: UserAlert[];
        unreadCount?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load alerts.");
      const nextAlerts = payload.alerts ?? [];
      if (!alertsSeededRef.current) {
        for (const alert of nextAlerts) {
          seenAlertKeysRef.current.add(alert.alertKey);
        }
        alertsSeededRef.current = true;
      } else {
        for (const alert of nextAlerts) {
          if (alert.category !== "connection_activity" || alert.readAt) continue;
          if (!alert.alertKey.includes("prediction-event:")) continue;
          if (seenAlertKeysRef.current.has(alert.alertKey)) continue;
          seenAlertKeysRef.current.add(alert.alertKey);
          toast?.showToast({
            message: `${alert.title} — ${alert.body}`,
            variant: "info",
            durationMs: 5600
          });
        }
      }
      setAlerts(nextAlerts);
      setUnreadCount(payload.unreadCount ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    if (status === "authenticated") {
      void load();
      const interval = window.setInterval(() => void load(), 60_000);
      return () => window.clearInterval(interval);
    }
    return undefined;
  }, [load, status]);

  const closePanel = useCallback(() => setOpen(false), []);

  useDismissOnOutsidePointerDown(open, closePanel, [panelRef]);
  useDismissOnEscape(open, closePanel);

  async function markRead(alert: UserAlert) {
    if (alert.readAt) return;
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId: alert.id })
    });
    setAlerts((current) =>
      current.map((row) => (row.id === alert.id ? { ...row, readAt: new Date().toISOString() } : row))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true })
    });
    setAlerts((current) => current.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div className="notifications-center" ref={panelRef}>
      <button
        aria-expanded={open}
        className="notification-button"
        type="button"
        aria-label={unreadCount > 0 ? `${unreadCount} unread alerts` : "Open alerts"}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? <span aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notifications-panel" role="dialog" aria-label="Alerts" aria-modal="true">
          <header className="notifications-panel-header">
            <h2>Alerts</h2>
            {unreadCount > 0 ? (
              <button className="text-button" type="button" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            ) : null}
          </header>

          {status !== "authenticated" ? (
            <p className="inline-status">Sign in to see connection activity and match alerts.</p>
          ) : null}

          {loading ? <p className="inline-status">Updating alerts…</p> : null}
          {error ? <p className="inline-status">{error}</p> : null}

          {!loading && status === "authenticated" && alerts.length === 0 ? (
            <p className="inline-status">
              No alerts yet. Connect with fans to see their predictions and boards; upcoming WC26
              kickoffs appear within three days of the match.
            </p>
          ) : null}

          <ul className="notifications-panel-list">
            {alerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  className={`notifications-panel-item${alert.readAt ? "" : " notifications-panel-item--unread"}`}
                  href={alert.href}
                  onClick={() => {
                    void markRead(alert);
                    setOpen(false);
                  }}
                >
                  <span className="notifications-panel-item-meta">
                    <span className="notifications-panel-category">{categoryLabel(alert.category)}</span>
                    <time dateTime={alert.occurredAt}>{formatWhen(alert.occurredAt)}</time>
                  </span>
                  <strong>{alert.title}</strong>
                  <span className="notifications-panel-body">{alert.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
