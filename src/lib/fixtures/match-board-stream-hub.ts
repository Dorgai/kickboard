import { loadMatchBoard } from "@/lib/fixtures/match-board";
import type { MatchBoardPayload } from "@/lib/fixtures/match-board-shared";
import { subscribeLiveFixtureUpdates, resetLiveFixtureSubscribe } from "@/lib/redis/live-fixtures-cache";

type Subscriber = (payload: MatchBoardPayload) => void;

const POLL_LIVE_MS = 4_000;
const POLL_IDLE_MS = 12_000;
const REDIS_DEBOUNCE_MS = 400;

function payloadFingerprint(payload: MatchBoardPayload): string {
  const parts: string[] = [
    String(payload.live.length),
    String(payload.recentResults.length),
    String(payload.startingSoon.length)
  ];
  for (const card of payload.live) {
    parts.push(
      `${card.fixtureKey}:${card.homeGoals ?? "n"}-${card.awayGoals ?? "n"}:${card.elapsed ?? "n"}:${card.statusShort}`
    );
  }
  for (const card of payload.recentResults.slice(0, 24)) {
    parts.push(`${card.fixtureKey}:${card.homeGoals ?? "n"}-${card.awayGoals ?? "n"}:${card.statusShort}`);
  }
  return parts.join("|");
}

class MatchBoardStreamHub {
  private subscribers = new Set<Subscriber>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private redisUnsubscribe: (() => void) | null = null;
  private redisDebounce: ReturnType<typeof setTimeout> | null = null;
  private lastFingerprint: string | null = null;
  private lastPayload: MatchBoardPayload | null = null;
  private loading = false;
  private hasLive = false;

  subscribe(callback: Subscriber) {
    this.subscribers.add(callback);
    if (this.lastPayload) {
      callback(this.lastPayload);
    }
    void this.ensureStarted();
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0) {
        this.stop();
      }
    };
  }

  private broadcast(payload: MatchBoardPayload) {
    for (const callback of this.subscribers) {
      callback(payload);
    }
  }

  private schedulePoll() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    const intervalMs = this.hasLive ? POLL_LIVE_MS : POLL_IDLE_MS;
    this.pollTimer = setInterval(() => {
      void this.refresh();
    }, intervalMs);
  }

  private async refresh() {
    if (this.loading || this.subscribers.size === 0) return;
    this.loading = true;
    try {
      const payload = await loadMatchBoard();
      this.hasLive =
        payload.live.length > 0 ||
        Object.values(payload.byKey).some((state) => state.status === "live");
      const fingerprint = payloadFingerprint(payload);
      if (fingerprint !== this.lastFingerprint) {
        this.lastFingerprint = fingerprint;
        this.lastPayload = payload;
        this.broadcast(payload);
      }
      this.schedulePoll();
    } catch {
      /* keep last good payload */
    } finally {
      this.loading = false;
    }
  }

  private onRedisUpdate() {
    if (this.redisDebounce) clearTimeout(this.redisDebounce);
    this.redisDebounce = setTimeout(() => {
      this.redisDebounce = null;
      void this.refresh();
    }, REDIS_DEBOUNCE_MS);
  }

  private async ensureStarted() {
    if (this.pollTimer) return;
    await this.refresh();
    this.schedulePoll();

    if (!this.redisUnsubscribe) {
      const unsubscribe = await subscribeLiveFixtureUpdates(() => this.onRedisUpdate());
      this.redisUnsubscribe = unsubscribe;
    }
  }

  private stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.redisDebounce) {
      clearTimeout(this.redisDebounce);
      this.redisDebounce = null;
    }
    if (this.redisUnsubscribe) {
      this.redisUnsubscribe();
      this.redisUnsubscribe = null;
      void resetLiveFixtureSubscribe();
    }
  }
}

export function getMatchBoardStreamHub(): MatchBoardStreamHub {
  const globalStore = globalThis as typeof globalThis & {
    __matchBoardStreamHub?: MatchBoardStreamHub;
  };
  if (!globalStore.__matchBoardStreamHub) {
    globalStore.__matchBoardStreamHub = new MatchBoardStreamHub();
  }
  return globalStore.__matchBoardStreamHub;
}
