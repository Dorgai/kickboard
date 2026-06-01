import { AppChrome } from "@/components/app-chrome";
import { FeedBrowser } from "@/components/feed-browser";

/** Client data loads in the browser; avoid year-long static HTML cache of an empty shell. */
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <AppChrome />
      <main id="main-content">
        <FeedBrowser />
      </main>
    </>
  );
}
