"use client";

import { AppChrome } from "@/components/app-chrome";
import { EventTabProvider } from "@/components/event-tab-provider";
import { FeedBrowser } from "@/components/feed-browser";
import { MatchBoardStrip } from "@/components/match-board-strip";
import { SiteFooter } from "@/components/site-footer";

export function HomeShell() {
  return (
    <EventTabProvider>
      <AppChrome showEventSelector />
      <MatchBoardStrip />
      <main id="main-content">
        <FeedBrowser />
      </main>
      <SiteFooter />
    </EventTabProvider>
  );
}
