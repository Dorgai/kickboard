"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthGate } from "@/components/auth-gate";
import { HelpTooltip } from "@/components/help-tooltip";
import { FixtureMatchHeader } from "@/components/fixture-match-header";
import { formatFixtureTeamsLabel, type FixtureOption, type MatchBoardGoal } from "@/lib/fixtures/fixture-key";
import { FriendsMatchActivity } from "@/components/friends-match-activity";
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
  homeTeam: string;
  awayTeam: string;
  group?: string | null;
  date?: string | null;
  status?: FixtureOption["status"];
  homeGoals?: number | null;
  awayGoals?: number | null;
  elapsed?: number | null;
  goalScorers?: MatchBoardGoal[];
  activeSquadId: string | null;
  newBoardNonce: number;
  onSquadSaved: (savedId: string) => void | Promise<void>;
};

export function CoachBoardPanel({
  fixtureKey,
  fixtureLabel,
  homeTeam,
  awayTeam,
  group = null,
  date = null,
  status = "upcoming",
  homeGoals,
  awayGoals,
  elapsed = null,
  goalScorers = [],
  activeSquadId,
  newBoardNonce,
  onSquadSaved
}: CoachBoardPanelProps) {
  const fixtureTeamsLabel = formatFixtureTeamsLabel(homeTeam, awayTeam);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

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

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  return (
    <AuthGate featureLabel="Coach Board">
      <div className="coach-board-panel">
        <SquadBuilder
          key={`${fixtureKey}:${newBoardNonce}`}
          activeSquadId={activeSquadId}
          awayTeam={awayTeam}
          fixtureKey={fixtureKey}
          fixtureLabel={fixtureTeamsLabel || fixtureLabel}
          homeTeam={homeTeam}
          pitchHeader={
            <div className="coach-board-pitch-match-header">
              <FixtureMatchHeader
                align="center"
                awayGoals={awayGoals}
                awayTeam={awayTeam}
                date={date}
                elapsed={elapsed}
                goalScorers={goalScorers}
                group={group}
                homeGoals={homeGoals}
                homeTeam={homeTeam}
                status={status}
              />
              <HelpTooltip
                className="coach-board-pitch-match-header-help"
                label="About Coach Board for this match"
                size="sm"
              >
                {fixtureTeamsLabel ? (
                  <>
                    <strong>{fixtureTeamsLabel}</strong> — squads and published lineups here are scoped
                    to this fixture. Fan Chat text posts are still moderated separately.
                  </>
                ) : (
                  <>
                    Squads and published lineups here are scoped to this fixture. Fan Chat text posts are
                    still moderated separately.
                  </>
                )}
              </HelpTooltip>
            </div>
          }
          onSaved={onSquadSaved}
        />

        <FriendsMatchActivity awayTeam={awayTeam} fixtureKey={fixtureKey} homeTeam={homeTeam} />

        <details className="coach-board-feed coach-board-feed-disclosure data-card surface-muted">
          <summary className="coach-board-feed-toggle">
            <span className="coach-board-feed-header">
              <span className="coach-board-feed-title">Approved feed</span>
              {!postsLoading ? (
                <span className="coach-board-feed-count">{posts.length}</span>
              ) : null}
            </span>
            <span aria-hidden className="coach-board-feed-chevron" />
          </summary>

          <div className="coach-board-feed-body">
            {postsLoading ? <p className="inline-status">Loading feed…</p> : null}
            {!postsLoading && posts.length === 0 ? (
              <p className="inline-status">No approved posts yet. Publish a squad or post in Fan Chat.</p>
            ) : null}
            {!postsLoading && posts.length > 0 ? (
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
            ) : null}
          </div>
        </details>
      </div>
    </AuthGate>
  );
}
