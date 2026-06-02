"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { FriendsMatchActivity } from "@/components/friends-match-activity";
import { SavedSquadsBar } from "@/components/saved-squads-bar";
import { SquadBuilder } from "@/components/squad-builder";
import type { SquadSummary } from "@/lib/squads/store";

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
  homeTeam: string;
  awayTeam: string;
};

export function CoachBoardPanel({
  fixtureKey,
  fixtureLabel,
  homeTeam,
  awayTeam
}: CoachBoardPanelProps) {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [squads, setSquads] = useState<SquadSummary[]>([]);
  const [squadsLoading, setSquadsLoading] = useState(true);
  const [activeSquadId, setActiveSquadId] = useState<string | null>(null);
  const [newBoardNonce, setNewBoardNonce] = useState(0);

  const refreshPosts = useCallback(async () => {
    setPostsLoading(true);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/community/posts?${params}`, { cache: "no-store" });
      const payload = (await response.json()) as { posts?: BoardPost[] };
      setPosts(payload.posts ?? []);
    } finally {
      setPostsLoading(false);
    }
  }, [fixtureKey]);

  const refreshSquads = useCallback(async () => {
    setSquadsLoading(true);
    try {
      const params = new URLSearchParams({ fixtureKey });
      const response = await fetch(`/api/squads?${params}`, { cache: "no-store" });
      if (!response.ok) {
        setSquads([]);
        return [];
      }
      const payload = (await response.json()) as { squads?: SquadSummary[] };
      const list = payload.squads ?? [];
      setSquads(list);
      return list;
    } catch {
      setSquads([]);
      return [];
    } finally {
      setSquadsLoading(false);
    }
  }, [fixtureKey]);

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    let cancelled = false;

    async function loadSquadsForFixture() {
      setActiveSquadId(null);
      setNewBoardNonce(0);
      const list = await refreshSquads();
      if (cancelled) return;
      setActiveSquadId(list[0]?.id ?? null);
    }

    void loadSquadsForFixture();
    return () => {
      cancelled = true;
    };
  }, [fixtureKey, refreshSquads]);

  const handleSelectSquad = useCallback((squadId: string) => {
    setNewBoardNonce(0);
    setActiveSquadId(squadId);
  }, []);

  const handleNewBoard = useCallback(() => {
    setActiveSquadId(null);
    setNewBoardNonce((value) => value + 1);
  }, []);

  const handleSquadSaved = useCallback(
    async (savedId: string) => {
      const list = await refreshSquads();
      setActiveSquadId(savedId || list[0]?.id || null);
    },
    [refreshSquads]
  );

  return (
    <AuthGate featureLabel="Coach Board">
      <div className="coach-board-panel">
        <p className="community-panel-lead">
          <strong>{fixtureLabel}</strong> — squads and published lineups here are scoped to this fixture.
          Fan Chat text posts are still moderated separately.
        </p>

        <SavedSquadsBar
          activeSquadId={activeSquadId}
          loading={squadsLoading}
          squads={squads}
          onNew={handleNewBoard}
          onSelect={handleSelectSquad}
        />

        <SquadBuilder
          key={`${fixtureKey}:${activeSquadId ?? "new"}:${newBoardNonce}`}
          activeSquadId={activeSquadId}
          awayTeam={awayTeam}
          fixtureKey={fixtureKey}
          fixtureLabel={fixtureLabel}
          homeTeam={homeTeam}
          onSaved={handleSquadSaved}
        />

        <FriendsMatchActivity awayTeam={awayTeam} fixtureKey={fixtureKey} homeTeam={homeTeam} />

        <div className="coach-board-feed">
          <h3>Approved feed</h3>
          {postsLoading ? <p className="inline-status">Loading feed…</p> : null}
          {!postsLoading && posts.length === 0 ? (
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
