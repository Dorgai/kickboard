"use client";

import { useCallback, useEffect, useState } from "react";

type ModerationPost = {
  id: string;
  body: string | null;
  authorDisplayName: string;
  createdAt: string;
  moderationStatus: "approved" | "withheld" | "removed";
};

export function CommunityModerationPanel({ adminToken }: { adminToken: string }) {
  const [posts, setPosts] = useState<ModerationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const headers = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json"
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/admin/community/posts", {
        headers,
        cache: "no-store"
      });
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
  }, [adminToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(postId: string, action: "approve" | "withhold" | "remove") {
    setBusyId(postId);
    setError(null);

    try {
      const response = await fetch("/api/admin/community/posts", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ postId, action })
      });
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
    return <p className="inline-status">Loading moderation queue…</p>;
  }

  return (
    <section className="admin-community-section">
      <div className="section-heading compact">
        <div>
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
