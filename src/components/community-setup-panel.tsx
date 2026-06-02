import type { CommunityHealth } from "@/lib/community/health";

type CommunitySetupPanelProps = {
  adminTokenConfigured: boolean;
  health: CommunityHealth;
  oauthConfigured: boolean;
};

export function CommunitySetupPanel({
  adminTokenConfigured,
  health,
  oauthConfigured
}: CommunitySetupPanelProps) {
  const ready =
    health.database &&
    health.jwt &&
    health.schemaReady &&
    health.writeProbeOk &&
    oauthConfigured;

  return (
    <section className="feed-status-panel admin-community-setup data-card surface-muted" aria-label="Community setup">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Community</p>
          <h2>Coach Board setup</h2>
          <p className={`admin-community-overall${ready ? " admin-community-overall--ok" : ""}`}>
            {ready ? "Ready — fans can join and posts can be moderated." : health.message}
          </p>
        </div>
        <a className="text-button" href="/api/community/status" rel="noopener noreferrer" target="_blank">
          Status API
        </a>
      </div>

      <div className="feed-status-grid">
        <SetupTile
          connected={health.database}
          detail="Railway Postgres plugin / DATABASE_URL"
          label="DATABASE_URL"
        />
        <SetupTile
          connected={health.jwt}
          detail="Signs kickboard_community_session cookies"
          label="JWT_SECRET"
        />
        <SetupTile
          connected={health.schemaReady && health.writeProbeOk}
          detail={
            health.writeProbeError
              ? health.writeProbeError
              : "users + posts + write test"
          }
          label="DB schema & write"
        />
        <SetupTile
          connected={adminTokenConfigured}
          detail="Optional — API/scripts without Google sign-in"
          label="ADMIN_DATA_SOURCES_TOKEN"
        />
        <SetupTile
          connected={oauthConfigured}
          detail="GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on kickboard service"
          label="Google OAuth"
        />
      </div>

      {!oauthConfigured ? (
        <div className="admin-community-setup-steps">
          <h3>Enable Google sign-in</h3>
          <p>
            Create a Web OAuth client in Google Cloud Console. Set redirect URI to{" "}
            <code>https://kickboard-production.up.railway.app/api/auth/callback/google</code> (or your custom
            domain).
          </p>
          <p className="admin-community-setup-note">
            Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in Railway variables, redeploy,
            then confirm <a href="/api/auth/config">/api/auth/config</a> shows <code>oauthConfigured: true</code>.
            See <code>docs/auth-oauth.md</code>.
          </p>
          <p className="admin-community-setup-note">
            Set <code>AUTH_URL</code> to your public site URL (same as <code>NEXT_PUBLIC_APP_URL</code>). After deploy,
            open <a href="/api/auth/providers">/api/auth/providers</a> — <code>callbackUrl</code> must not be{" "}
            <code>0.0.0.0</code>.
          </p>
        </div>
      ) : (
        <div className="admin-community-setup-steps">
          <h3>Publish Google sign-in (not test-only)</h3>
          <p>
            OAuth is configured on Railway. To let <strong>any</strong> Google user sign in (not just test users),
            publish the consent screen in Google Cloud and use these URLs:
          </p>
          <ul className="auth-oauth-setup-list">
            <li>
              Privacy policy: <a href="/privacy">/privacy</a>
            </li>
            <li>
              Terms: <a href="/terms">/terms</a>
            </li>
          </ul>
          <p className="admin-community-setup-note">
            Step-by-step: <code>docs/publish-production.md</code> (Publish app, External users, matching redirect URIs).
          </p>
        </div>
      )}

      {!health.schemaReady && health.database ? (
        <div className="admin-community-setup-steps">
          <h3>Install schema (one time)</h3>
          <p>From a shell that can reach this Railway database:</p>
          <pre className="admin-code-block">
            <code>{`export DATABASE_URL="<your-railway-postgres-url>"
npm run db:schema`}</code>
          </pre>
          <p className="admin-community-setup-note">
            Use the <strong>public</strong> Postgres URL (<code>DATABASE_PUBLIC_URL</code> or Connect → Public
            URL). The web service&apos;s private <code>postgres.railway.internal</code> URL only works inside
            Railway, not from your laptop or GitHub Actions.
          </p>
          <p className="admin-community-setup-note">
            Applies all files under <code>db/</code> (schema, community, auth, predictions, alerts, etc.). Then
            open <a href="/api/community/status">/api/community/status</a> — <code>schemaReady</code> must be{" "}
            <code>true</code>.
          </p>
        </div>
      ) : null}

      {!adminTokenConfigured ? (
        <p className="inline-status admin-community-setup-note">
          <code>ADMIN_DATA_SOURCES_TOKEN</code> is optional if you use Google admin sign-in (
          <code>ADMIN_EMAILS</code>). Set it only if you need token-based API access or a non-Google operator
          login.
        </p>
      ) : null}
    </section>
  );
}

function SetupTile({
  connected,
  detail,
  label
}: {
  connected: boolean;
  detail: string;
  label: string;
}) {
  return (
    <article className={`feed-status-tile${connected ? " connected" : ""}`}>
      <span className={`feed-status-dot${connected ? " on" : ""}`} aria-hidden="true" />
      <div>
        <h3>{label}</h3>
        <p>{detail}</p>
        <p className="feed-status-meta">{connected ? "OK" : "Action required"}</p>
      </div>
    </article>
  );
}
