"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTooltip } from "@/components/help-tooltip";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";
import type { OnboardingTip } from "@/lib/onboarding-tips/types";
import {
  ONBOARDING_TIPS_CAMPAIGN_MS,
  ONBOARDING_TIPS_INTERVAL_MS,
  ONBOARDING_TIPS_NEW_USER_DAYS,
  ONBOARDING_TIPS_VISIBLE_MS
} from "@/lib/onboarding-tips/types";

export function AdminOnboardingTipsPanel({ auth }: { auth: { mode: AdminAuthMode; token?: string } }) {
  const [tips, setTips] = useState<OnboardingTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/onboarding-tips", undefined, auth);
      const payload = (await response.json()) as {
        error?: string;
        tips?: OnboardingTip[];
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load tips.");
      setTips(payload.tips ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load tips.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    void loadTips();
  }, [loadTips]);

  function updateTip(id: string, patch: Partial<OnboardingTip>) {
    setTips((current) => current.map((tip) => (tip.id === id ? { ...tip, ...patch } : tip)));
  }

  async function saveTips() {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const response = await adminFetch("/api/admin/onboarding-tips", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tips })
      }, auth);
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        tips?: OnboardingTip[];
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to save tips.");
      setTips(payload.tips ?? tips);
      setNotice(payload.message ?? "Tips published.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save tips.");
    } finally {
      setBusy(false);
    }
  }

  const enabledCount = tips.filter((tip) => tip.enabled).length;

  return (
    <section className="admin-onboarding-tips data-card surface-muted" aria-label="Onboarding tips">
      <header className="admin-onboarding-tips-header">
        <div>
          <h2 className="admin-onboarding-tips-title">
            New user tips
            <HelpTooltip label="About onboarding tips" size="sm">
              Floating “Did you know?” tips for users who completed onboarding in the last{" "}
              {ONBOARDING_TIPS_NEW_USER_DAYS} days. Each tip shows briefly; the session stops after{" "}
              {Math.round(ONBOARDING_TIPS_CAMPAIGN_MS / 60000)} minutes. Defaults ship from{" "}
              <code>content/onboarding-tips.json</code>; saving here publishes to the database for
              production.
            </HelpTooltip>
          </h2>
          <p className="admin-onboarding-tips-lead">
            {enabledCount} of {tips.length} tips enabled · visible ~{Math.round(ONBOARDING_TIPS_VISIBLE_MS / 1000)}s
            · next tip every ~{Math.round(ONBOARDING_TIPS_INTERVAL_MS / 1000)}s
          </p>
        </div>
        <div className="admin-onboarding-tips-actions">
          <button className="button secondary" disabled={busy || loading} type="button" onClick={() => void loadTips()}>
            Reload
          </button>
          <button className="button primary" disabled={busy || loading || tips.length === 0} type="button" onClick={() => void saveTips()}>
            {busy ? "Publishing…" : "Publish tips"}
          </button>
        </div>
      </header>

      {loading ? <p className="inline-status">Loading tips…</p> : null}
      {error ? <p className="inline-status">{error}</p> : null}
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}

      {!loading && tips.length > 0 ? (
        <ol className="admin-onboarding-tips-list">
          {tips.map((tip, index) => (
            <li className="admin-onboarding-tips-row" key={tip.id}>
              <span className="admin-onboarding-tips-index">{index + 1}</span>
              <label className="admin-onboarding-tips-enable">
                <input
                  checked={tip.enabled}
                  type="checkbox"
                  onChange={(event) => updateTip(tip.id, { enabled: event.target.checked })}
                />
                <span className="sr-only">Enable tip {index + 1}</span>
              </label>
              <textarea
                className="admin-onboarding-tips-message feed-control-input"
                rows={2}
                value={tip.message}
                onChange={(event) => updateTip(tip.id, { message: event.target.value })}
              />
              <code className="admin-onboarding-tips-id">{tip.id}</code>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
