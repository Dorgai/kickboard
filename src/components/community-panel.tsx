"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { HelpTooltip, PanelHelpRow } from "@/components/help-tooltip";

type CommunityUser = {
  id: string;
  username: string;
  displayName: string;
  isChild: boolean;
};

type CommunityPost = {
  id: string;
  postType: string;
  body: string | null;
  authorDisplayName: string;
  authorUsername: string;
  createdAt: string;
  commentCount: number;
};

type CommunityStatus = {
  connected: boolean;
  database: boolean;
  jwt: boolean;
  schemaReady?: boolean;
  writeProbeOk?: boolean;
  writeProbeError?: string | null;
  message: string;
};

export function CommunityPanel({ embedded = false }: { embedded?: boolean }) {
  const [status, setStatus] = useState<CommunityStatus | null>(null);
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 18));
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [statusResponse, sessionResponse, postsResponse] = await Promise.all([
        fetch("/api/community/status", { cache: "no-store" }),
        fetch("/api/community/session", { cache: "no-store" }),
        fetch("/api/community/posts", { cache: "no-store" })
      ]);

      const statusPayload = (await statusResponse.json()) as CommunityStatus;
      const sessionPayload = (await sessionResponse.json()) as { user: CommunityUser | null };
      const postsPayload = (await postsResponse.json()) as { posts: CommunityPost[] };

      setStatus(statusPayload);
      setUser(sessionPayload.user ?? null);
      setPosts(postsPayload.posts ?? []);
    } catch {
      setError("Unable to load community feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/community/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, birthYear: Number(birthYear) })
      });
      const payload = (await response.json()) as { error?: string; user?: CommunityUser };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to join.");
      }

      setUser(payload.user ?? null);
      setNotice("You can post on the Coach Board feed.");
      await refresh();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Unable to join.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePost(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft })
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to post.");
      }

      setDraft("");
      setNotice(payload.message ?? "Post published.");
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "Unable to post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport(postId: string) {
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/community/posts/${postId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "other" })
      });
      const payload = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to report.");
      }

      setNotice(payload.message ?? "Report submitted.");
      await refresh();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "Unable to report.");
    }
  }

  async function handleSignOut() {
    await fetch("/api/community/session", { method: "DELETE" });
    setUser(null);
    setNotice(null);
    await refresh();
  }

  if (loading) {
    return <p className="inline-status">Loading community…</p>;
  }

  if (!status?.connected) {
    return (
      <div className="community-setup">
        <p className="inline-status">{status?.writeProbeError ?? status?.message ?? "Community is not configured yet."}</p>
        <p className="community-setup-note">
          {status?.writeProbeError ? (
            <>{status.writeProbeError} Check Admin → Data sources → Coach Board setup for details.</>
          ) : status?.schemaReady === false && status.database ? (
            <>
              Postgres is connected but tables are missing. From a machine that can reach your Railway
              database, run <code>npm run db:schema</code> (loads <code>db/schema.sql</code> and{" "}
              <code>db/community-extensions.sql</code>).
            </>
          ) : (
            <>
              Attach Postgres on Railway, run <code>npm run db:schema</code>, and set{" "}
              <code>JWT_SECRET</code>. Admins moderate content from the dashboard after it is published.
            </>
          )}
        </p>
        <p className="community-setup-note">
          There is no community password yet — join uses display name + birth year, then an httpOnly session
          cookie. Admin moderation uses <code>ADMIN_DATA_SOURCES_TOKEN</code>, not your community login.
        </p>
      </div>
    );
  }

  return (
    <div className="community-panel">
      {!embedded ? (
        <header className="community-panel-header">
          <div>
            <p className="eyebrow">Fan Chat</p>
            <h3 className="panel-help-row community-panel-title">
              Community posts
              <HelpTooltip label="Community posts" size="sm">
                Short moderated posts. Sign in with Google on Current event (OAuth).
              </HelpTooltip>
            </h3>
          </div>
          {user ? (
            <div className="community-session-chip">
              <span>{user.displayName}</span>
              <button className="text-button" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </header>
      ) : (
        <PanelHelpRow
          className="panel-help-row--block"
          help="Text-only posts for match takes. Squad shares belong on the Coach Board above."
          helpLabel="Embedded community posts"
          title="Fan Chat posts"
        />
      )}

      {error ? <p className="inline-error">{error}</p> : null}
      {notice ? <p className="inline-status community-notice">{notice}</p> : null}

      {!embedded && !user ? (
        <form className="community-join-form" onSubmit={handleJoin}>
          <h3 className="panel-help-row">
            Legacy join (dev)
            <HelpTooltip label="Legacy join" size="sm">
              Prefer Google sign-in on Current event. This fallback creates a local-only account when OAuth
              is not configured.
            </HelpTooltip>
          </h3>
          <label className="feed-control-field">
            Display name
            <input
              className="feed-control-input"
              maxLength={60}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label className="feed-control-field">
            Birth year
            <input
              className="feed-control-input"
              inputMode="numeric"
              max={new Date().getFullYear()}
              min={1900}
              required
              type="number"
              value={birthYear}
              onChange={(event) => setBirthYear(event.target.value)}
            />
          </label>
          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Joining…" : "Join (legacy)"}
          </button>
        </form>
      ) : embedded || user ? (
        <form className="community-compose-form" onSubmit={handlePost}>
          <label className="feed-control-field">
            New post
            <textarea
              className="feed-control-input community-compose-input"
              maxLength={280}
              placeholder="Share a match take (280 characters max)"
              required
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <div className="community-compose-footer">
            <span className="community-char-count">{draft.length}/280</span>
            <button className="button" disabled={submitting} type="submit">
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="community-feed" role="feed">
        {posts.length === 0 ? (
          <p className="inline-status">No posts yet. Be the first to share.</p>
        ) : (
          posts.map((post) => (
            <article className="community-post-card" key={post.id}>
              <header className="community-post-header">
                <strong>{post.authorDisplayName}</strong>
                <time dateTime={post.createdAt}>{formatRelative(post.createdAt)}</time>
              </header>
              <p className="community-post-body">{post.body}</p>
              <footer className="community-post-footer">
                <button className="text-button" type="button" onClick={() => handleReport(post.id)}>
                  Report
                </button>
              </footer>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  const deltaMs = Date.now() - date.getTime();
  const minutes = Math.round(deltaMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return date.toLocaleDateString();
}
