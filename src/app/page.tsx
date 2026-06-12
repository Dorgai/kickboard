import { AppChrome } from "@/components/app-chrome";
import { FeedBrowser } from "@/components/feed-browser";
import { MatchBoardStrip } from "@/components/match-board-strip";
import { SiteFooter } from "@/components/site-footer";

/** Client data loads in the browser; avoid year-long static HTML cache of an empty shell. */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <AppChrome />
      <MatchBoardStrip />
      <main id="main-content">
        <FeedBrowser />
      </main>
      <SiteFooter />
    </>
  );
}
