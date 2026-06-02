import { cookies, headers } from "next/headers";
import { Suspense } from "react";
import { AdminAccessGate } from "@/components/admin-access-gate";
import { AdminDashboard } from "@/components/admin-dashboard";
import { auth, isOAuthConfigured } from "@/auth";
import { getCommunityHealth } from "@/lib/community/health";
import { ADMIN_COOKIE, getAdminAuthStatus, readAdminToken } from "@/lib/admin/auth";
import { isAdminEmail } from "@/lib/admin/emails";
import type { AdminAuthMode } from "@/lib/admin/fetch";
import { buildAdminDataSources } from "@/lib/admin/data-sources";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Kickboard Admin | Dashboard"
};

function isPageTokenAuthorized(token: string | null) {
  const configuredToken = process.env.ADMIN_DATA_SOURCES_TOKEN;
  return Boolean(configuredToken && token && token === configuredToken);
}

export default async function AdminDataSourcesPage({
  searchParams
}: {
  searchParams: Promise<{ token?: string; tab?: string }>;
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
    <Suspense fallback={<AdminDashboardFallback />}>
      <AdminDashboard
        adminTokenConfigured={adminTokenConfigured}
        auth={adminAuth}
        communityHealth={communityHealth}
        data={data}
        initialTab={params.tab ?? null}
        isOAuthSession={oauthAdmin}
        oauthConfigured={oauthConfigured}
        signedInEmail={session?.user?.email ?? null}
      />
    </Suspense>
  );
}

function AdminDashboardFallback() {
  return (
    <main className="feed-browser admin-dashboard" id="main-content">
      <div className="current-event-overview admin-dashboard-overview">
        <div className="current-event-overview-heading">
          <div>
            <p className="eyebrow">Admin only</p>
            <h2>Admin dashboard</h2>
            <p className="inline-status">Loading…</p>
          </div>
        </div>
      </div>
    </main>
  );
}
