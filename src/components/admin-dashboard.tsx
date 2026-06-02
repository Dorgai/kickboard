"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminHelpSupportPanel } from "@/components/admin-help-support-panel";
import { AdminFanChatModerationPanel } from "@/components/admin-fan-chat-moderation-panel";
import { AdminUserActivityPanel } from "@/components/admin-user-activity-panel";
import { AdminUserManagementPanel } from "@/components/admin-user-management-panel";
import { CommunityModerationPanel } from "@/components/community-moderation-panel";
import { CommunitySetupPanel } from "@/components/community-setup-panel";
import { FeedStatusPanel } from "@/components/feed-status-panel";
import type { AdminDataSource } from "@/lib/admin/data-sources";
import type { AdminAuthMode } from "@/lib/admin/fetch";
import type { CommunityHealth } from "@/lib/community/health";

export const ADMIN_DASHBOARD_TAB_IDS = ["overview", "sources", "users", "moderation", "help"] as const;
export type AdminDashboardTabId = (typeof ADMIN_DASHBOARD_TAB_IDS)[number];

const ADMIN_DASHBOARD_TABS: { id: AdminDashboardTabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sources", label: "Data sources" },
  { id: "users", label: "Users" },
  { id: "moderation", label: "Moderation" },
  { id: "help", label: "Help" }
];

type AdminDashboardProps = {
  auth: { mode: AdminAuthMode; token?: string };
  isOAuthSession: boolean;
  signedInEmail: string | null;
  data: {
    generatedAt: string;
    summary: { total: number; connected: number; notConfigured: number };
    sources: AdminDataSource[];
  };
  communityHealth: CommunityHealth;
  adminTokenConfigured: boolean;
  oauthConfigured: boolean;
  initialTab: string | null;
};

function parseTab(value: string | null, schemaReady: boolean): AdminDashboardTabId {
  const allowed = schemaReady
    ? ADMIN_DASHBOARD_TAB_IDS
    : (["overview", "sources"] as const);
  if (value && (allowed as readonly string[]).includes(value)) {
    return value as AdminDashboardTabId;
  }
  return "overview";
}

export function AdminDashboard({
  auth,
  isOAuthSession,
  signedInEmail,
  data,
  communityHealth,
  adminTokenConfigured,
  oauthConfigured,
  initialTab
}: AdminDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const schemaReady = communityHealth.schemaReady;

  const [activeTab, setActiveTab] = useState<AdminDashboardTabId>(() =>
    parseTab(initialTab, schemaReady)
  );

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab"), schemaReady));
  }, [schemaReady, searchParams]);

  const visibleTabs = useMemo(
    () =>
      schemaReady
        ? ADMIN_DASHBOARD_TABS
        : ADMIN_DASHBOARD_TABS.filter((tab) => tab.id === "overview" || tab.id === "sources"),
    [schemaReady]
  );

  const selectTab = useCallback(
    (tab: AdminDashboardTabId) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      const query = params.toString();
      router.replace(query ? `/admin/data-sources?${query}` : "/admin/data-sources", { scroll: false });
    },
    [router, searchParams]
  );

  const effectiveTab = visibleTabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  return (
    <main className="feed-browser admin-dashboard" id="main-content">
      <div className="current-event-overview admin-dashboard-overview">
        <div className="current-event-overview-heading">
          <div>
            <p className="eyebrow">Admin only</p>
            <h2>Admin dashboard</h2>
            <p className="admin-dashboard-lead">
              {isOAuthSession && signedInEmail ? (
                <>
                  Signed in as <strong>{signedInEmail}</strong>. Use the tabs below to monitor feeds, users,
                  and moderation.
                </>
              ) : (
                <>Operator token session. Use the tabs below to monitor feeds, users, and moderation.</>
              )}
            </p>
          </div>
        </div>
      </div>

      <nav
        className="event-tab-bar current-event-section-tabs admin-dashboard-tabs"
        aria-label="Admin dashboard sections"
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            aria-current={effectiveTab === tab.id ? "page" : undefined}
            className={effectiveTab === tab.id ? "active" : ""}
            type="button"
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="current-event-tab-panel admin-dashboard-panel" role="tabpanel">
        {effectiveTab === "overview" ? (
          <>
            <section className="current-summary-grid admin-summary-grid" aria-label="Data source summary">
              <SummaryCard label="Sources" value={data.summary.total} />
              <SummaryCard label="Connected" value={data.summary.connected} />
              <SummaryCard label="Not configured" value={data.summary.notConfigured} />
              <SummaryCard label="Last checked" value={new Date(data.generatedAt).toLocaleString()} />
            </section>
            <FeedStatusPanel />
          </>
        ) : null}

        {effectiveTab === "sources" ? (
          <>
            <CommunitySetupPanel
              adminTokenConfigured={adminTokenConfigured}
              health={communityHealth}
              oauthConfigured={oauthConfigured}
            />
            <AdminSourceGrid sources={data.sources} />
          </>
        ) : null}

        {effectiveTab === "users" && schemaReady ? (
          <>
            <AdminUserActivityPanel auth={auth} />
            <AdminUserManagementPanel auth={auth} />
          </>
        ) : null}

        {effectiveTab === "moderation" && schemaReady ? (
          <>
            <AdminFanChatModerationPanel auth={auth} />
            <CommunityModerationPanel auth={auth} />
          </>
        ) : null}

        {effectiveTab === "help" && schemaReady ? <AdminHelpSupportPanel auth={auth} /> : null}
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="summary-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AdminSourceGrid({ sources }: { sources: AdminDataSource[] }) {
  return (
    <section className="admin-source-grid" aria-label="Connected data sources">
      {sources.map((source) => (
        <article className="admin-source-card data-card surface-muted" key={source.id}>
          <div className="admin-source-heading">
            <div>
              <span className={`admin-status admin-status-${source.status}`}>
                {source.status.replace("_", " ")}
              </span>
              <h2>{source.name}</h2>
              <p>{source.message}</p>
            </div>
            <strong>{source.category}</strong>
          </div>

          <dl className="admin-source-meta">
            <div>
              <dt>Connected</dt>
              <dd>{source.connected ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Last checked</dt>
              <dd>{new Date(source.lastCheckedAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Last refreshed</dt>
              <dd>{source.lastRefreshedAt ?? "Not reported by source"}</dd>
            </div>
            <div>
              <dt>Cadence</dt>
              <dd>{source.refreshCadence}</dd>
            </div>
          </dl>

          {source.records ? (
            <div className="admin-record-grid">
              {Object.entries(source.records).map(([key, value]) => (
                <div key={`${source.id}-${key}`}>
                  <span>{key}</span>
                  <strong>{value ?? "n/a"}</strong>
                </div>
              ))}
            </div>
          ) : null}

          <div className="admin-update-list">
            <h3>Updates</h3>
            {source.updates.map((update) => (
              <span key={`${source.id}-${update}`}>{update}</span>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
