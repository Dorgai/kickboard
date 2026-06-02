"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, type AdminAuthMode } from "@/lib/admin/fetch";

type ModerationPost = {
  id: string;
  body: string | null;
  authorDisplayName: string;
  createdAt: string;
  moderationStatus: "approved" | "withheld" | "removed";
};

export function CommunityModerationPanel({
  auth
}: {
  auth: { mode: AdminAuthMode; token?: string };
}) {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await adminFetch(
        "/api/admin/community/posts",
        { headers: { "Content-Type": "application/json" } },
        auth
      );
      const payload = (await response.json()) as { error?: string; posts?: ModerationPost[] };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load queue.");
      }

      setPosts(payload.posts ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load queue.");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(postId: string, action: "approve" | "withhold" | "remove") {
    setBusyId(postId);
    setError(null);

    try {
      const response = await adminFetch(
        "/api/admin/community/posts",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, action })
        },
        auth
      );
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to update post.");
      }

      await load();
    } catch (moderationError) {
      setError(moderationError instanceof Error ? moderationError.message : "Unable to update post.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <section className="admin-community-section data-card surface-muted">
        <p className="inline-status">Loading moderation queue…</p>
      </section>
    );
  }

  return (
    <section className="admin-community-section data-card surface-muted">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Moderation</p>
          <h2>Community moderation</h2>
          <p>Hide or remove Coach Board posts and restore content when appropriate.</p>
        </div>
        <button className="button secondary" type="button" onClick={load}>
          Refresh
        </button>
      </div>

      {error ? <p className="inline-error">{error}</p> : null}

      {posts.length === 0 ? (
        <p className="inline-status">No posts to review.</p>
      ) : (
        <ul className="community-moderation-list">
          {posts.map((post) => (
            <li className="community-moderation-item" key={post.id}>
              <div>
                <p className="community-moderation-meta">
                  <strong>{post.authorDisplayName}</strong> · {new Date(post.createdAt).toLocaleString()} ·{" "}
                  <span className={`community-mod-status community-mod-status--${post.moderationStatus}`}>
                    {post.moderationStatus}
                  </span>
                </p>
                <p className="community-post-body">{post.body}</p>
              </div>
              <div className="community-moderation-actions">
                {post.moderationStatus !== "approved" ? (
                  <button
                    className="button"
                    disabled={busyId === post.id}
                    type="button"
                    onClick={() => moderate(post.id, "approve")}
                  >
                    Restore
                  </button>
                ) : null}
                <button
                  className="button secondary"
                  disabled={busyId === post.id}
                  type="button"
                  onClick={() => moderate(post.id, "withhold")}
                >
                  Hide
                </button>
                <button
                  className="button secondary"
                  disabled={busyId === post.id}
                  type="button"
                  onClick={() => moderate(post.id, "remove")}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
