import type { CommunityHealth } from "@/lib/community/health";

type CommunitySetupPanelProps = {
  adminTokenConfigured: boolean;
  health: CommunityHealth;
};

export function CommunitySetupPanel({ adminTokenConfigured, health }: CommunitySetupPanelProps) {
  const ready =
    health.database && health.jwt && health.schemaReady && health.writeProbeOk && adminTokenConfigured;

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
          detail="Bearer token for moderation API on this page"
          label="ADMIN_DATA_SOURCES_TOKEN"
        />
      </div>

      {!health.schemaReady && health.database ? (
        <div className="admin-community-setup-steps">
          <h3>Install schema (one time)</h3>
          <p>From a shell that can reach this Railway database:</p>
          <pre className="admin-code-block">
            <code>{`export DATABASE_URL="<your-railway-postgres-url>"
npm run db:schema`}</code>
          </pre>
          <p className="admin-community-setup-note">
            Applies <code>db/schema.sql</code> and <code>db/community-extensions.sql</code>. Fan join does not
            use a password — only display name, birth year, and an httpOnly session cookie.
          </p>
        </div>
      ) : null}

      {!adminTokenConfigured ? (
        <p className="inline-status admin-community-setup-note">
          Set <code>ADMIN_DATA_SOURCES_TOKEN</code> in Railway variables to unlock this page and the moderation
          queue below.
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
