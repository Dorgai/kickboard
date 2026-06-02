"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { SquadBuilder } from "@/components/squad-builder";

type BoardPost = {
  id: string;
  postType: string;
  body: string | null;
  authorDisplayName: string;
  createdAt: string;
};

type CoachBoardPanelProps = {
  fixtureKey: string;
  fixtureLabel: string;
};

export function CoachBoardPanel({ fixtureKey, fixtureLabel }: CoachBoardPanelProps) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/community/posts?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as { posts?: BoardPost[] };
      setPosts(payload.posts ?? []);
    } finally {
      setLoading(false);
    }
  }, [fixtureKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthGate featureLabel="Coach Board">
      <div className="coach-board-panel">
        <p className="community-panel-lead">
          <strong>{fixtureLabel}</strong> — squads and posts here are only for this fixture. New shares
          are held for moderation before they appear in the feed below.
        </p>

        <SquadBuilder fixtureKey={fixtureKey} fixtureLabel={fixtureLabel} />

        <div className="coach-board-feed">
          <h3>Approved feed</h3>
          {loading ? <p className="inline-status">Loading feed…</p> : null}
          {!loading && posts.length === 0 ? (
            <p className="inline-status">No approved posts yet. Publish a squad or post in Fan Chat.</p>
          ) : null}
          <div className="community-feed" role="feed">
            {posts.map((post) => (
              <article className="community-post-card" key={post.id}>
                <header className="community-post-header">
                  <strong>{post.authorDisplayName}</strong>
                  <span className="coach-board-post-type">{post.postType.replace("_", " ")}</span>
                  <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time>
                </header>
                <p className="community-post-body">{post.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}
