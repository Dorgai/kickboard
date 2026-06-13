"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "@/components/locale-provider";
import type { UserAlert } from "@/lib/alerts/types";
import { PushNotificationsPrompt } from "@/components/push-notifications-prompt";
import {
  useDismissOnEscape,
  useDismissOnOutsidePointerDown
} from "@/lib/use-dismiss-on-outside-pointer-down";

function categoryLabel(
  category: UserAlert["category"],
  t: ReturnType<typeof useTranslation>["t"]
) {
  if (category === "connection_activity") return t("notifications.categoryConnection");
  if (category === "match_upcoming") return t("notifications.categoryUpcoming");
  return t("notifications.categoryResult");
}

function formatWhen(iso: string, t: ReturnType<typeof useTranslation>["t"]) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return t("notifications.timeJustNow");
  if (mins < 60) return t("notifications.timeMinutesAgo", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 48) return t("notifications.timeHoursAgo", { count: hours });
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsCenter() {
  const { t } = useTranslation();
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<UserAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
      if (!response.ok) throw new Error(payload.error ?? t("notifications.loadError"));
      setAlerts(payload.alerts ?? []);
      setUnreadCount(payload.unreadCount ?? 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("notifications.loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

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
        aria-label={
          unreadCount > 0
            ? t("notifications.unreadAlerts", { count: unreadCount })
            : t("notifications.openAlerts")
        }
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void load();
        }}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 ? <span aria-hidden="true">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notifications-panel" role="dialog" aria-label={t("notifications.title")} aria-modal="true">
          <header className="notifications-panel-header">
            <h2>{t("notifications.title")}</h2>
            {unreadCount > 0 ? (
              <button className="text-button" type="button" onClick={() => void markAllRead()}>
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </header>

          {status !== "authenticated" ? (
            <p className="inline-status">{t("notifications.signInToSee")}</p>
          ) : (
            <PushNotificationsPrompt />
          )}

          {loading ? <p className="inline-status">{t("notifications.updating")}</p> : null}
          {error ? <p className="inline-status">{error}</p> : null}

          {!loading && status === "authenticated" && alerts.length === 0 ? (
            <p className="inline-status">{t("notifications.empty")}</p>
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
                    <span className="notifications-panel-category">{categoryLabel(alert.category, t)}</span>
                    <time dateTime={alert.occurredAt}>{formatWhen(alert.occurredAt, t)}</time>
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
