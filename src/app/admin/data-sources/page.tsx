import { cookies, headers } from "next/headers";
import { AdminAccessGate } from "@/components/admin-access-gate";
import { AdminFanChatModerationPanel } from "@/components/admin-fan-chat-moderation-panel";
import { AdminUserActivityPanel } from "@/components/admin-user-activity-panel";
import { AdminUserManagementPanel } from "@/components/admin-user-management-panel";
import { CommunityModerationPanel } from "@/components/community-moderation-panel";
import { CommunitySetupPanel } from "@/components/community-setup-panel";
import { FeedStatusPanel } from "@/components/feed-status-panel";
import { auth, isOAuthConfigured } from "@/auth";
import { getCommunityHealth } from "@/lib/community/health";
import { ADMIN_COOKIE, getAdminAuthStatus, readAdminToken } from "@/lib/admin/auth";
import { isAdminEmail } from "@/lib/admin/emails";
import type { AdminAuthMode } from "@/lib/admin/fetch";
import { buildAdminDataSources } from "@/lib/admin/data-sources";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kickboard Admin | Data sources"
};

function isPageTokenAuthorized(token: string | null) {
  const configuredToken = process.env.ADMIN_DATA_SOURCES_TOKEN;
  return Boolean(configuredToken && token && token === configuredToken);
}

export default async function AdminDataSourcesPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const headerStore = await headers();
  const cookieStore = await cookies();
  const token = readAdminToken({
    authorization: headerStore.get("authorization"),
    cookieToken: cookieStore.get(ADMIN_COOKIE)?.value,
    headerToken: headerStore.get("x-admin-token"),
    queryToken: params.token ?? null
  });

  const session = await auth();
  const oauthAdmin = Boolean(session?.user?.email && isAdminEmail(session.user.email));
  const tokenAuth = isPageTokenAuthorized(token);

  const { configured } = getAdminAuthStatus();
  const oauthConfigured = isOAuthConfigured();

  if (!oauthAdmin && !tokenAuth) {
    return <AdminAccessGate adminConfigured={configured} oauthConfigured={oauthConfigured} />;
  }

  const adminAuth: { mode: AdminAuthMode; token?: string } = oauthAdmin
    ? { mode: "oauth" }
    : { mode: "token", token: token! };

  const data = await buildAdminDataSources();
  const communityHealth = await getCommunityHealth();
  const adminTokenConfigured = Boolean(process.env.ADMIN_DATA_SOURCES_TOKEN?.trim());

  return (
    <main className="admin-page" id="main-content">
      <section className="admin-hero">
        <p className="eyebrow">Admin only</p>
        <h1>Admin dashboard</h1>
        <p>
          {oauthAdmin ? (
            <>
              Signed in as <strong>{session?.user?.email}</strong>. Monitor feeds, user activity, moderation,
              and infrastructure.
            </>
          ) : (
            <>
              Operator token session. Monitor feeds, user activity, moderation, and infrastructure.
            </>
          )}
        </p>
      </section>

      <section className="admin-summary-grid" aria-label="Data source summary">
        <SummaryCard label="Sources" value={data.summary.total} />
        <SummaryCard label="Connected" value={data.summary.connected} />
        <SummaryCard label="Not configured" value={data.summary.notConfigured} />
        <SummaryCard label="Last checked" value={new Date(data.generatedAt).toLocaleString()} />
      </section>

      {communityHealth.schemaReady ? (
        <AdminUserActivityPanel auth={adminAuth} />
      ) : null}

      <FeedStatusPanel />

      <CommunitySetupPanel
        adminTokenConfigured={adminTokenConfigured}
        health={communityHealth}
        oauthConfigured={oauthConfigured}
      />

      {communityHealth.schemaReady ? (
        <>
          <AdminUserManagementPanel auth={adminAuth} />
          <AdminFanChatModerationPanel auth={adminAuth} />
          <CommunityModerationPanel auth={adminAuth} />
        </>
      ) : null}

      <section className="admin-source-grid">
        {data.sources.map((source) => (
          <article className="admin-source-card" key={source.id}>
            <div className="admin-source-heading">
              <div>
                <span className={`admin-status admin-status-${source.status}`}>{source.status.replace("_", " ")}</span>
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
