import { AppChrome } from "@/components/app-chrome";
import { FeedBrowser } from "@/components/feed-browser";

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
