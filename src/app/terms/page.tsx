import Link from "next/link";
import { AppChrome } from "@/components/app-chrome";

export const metadata = {
  title: "Terms of Use | Kickboard",
  description: "Rules for using the Kickboard fan platform."
};

export default function TermsPage() {
  const updated = "June 2026";

  return (
    <>
      <AppChrome />
      <main className="legal-page" id="main-content">
        <article className="legal-document">
          <p className="eyebrow">Legal</p>
          <h1>Terms of Use</h1>
          <p className="legal-updated">Last updated: {updated}</p>

          <p>
            By using Kickboard you agree to these terms. If you do not agree, do not use the service.
          </p>

          <h2>The service</h2>
          <p>
            Kickboard provides tournament information, squad tools, predictions, and social features for fans.
            Features may change or be unavailable during beta. Match data may come from third-party sources and
            is provided without guarantee of accuracy or timeliness.
          </p>

          <h2>Accounts</h2>
          <p>
            You sign in with Google. You are responsible for activity on your account. You must provide accurate
            information during onboarding (including birth year for age rules).
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Do not harass, spam, or post illegal content.</li>
            <li>Do not attempt to break security or access other users&apos; private data.</li>
            <li>Do not use the service for gambling or real-money wagering.</li>
          </ul>
          <p>
            We may suspend, ban, or remove content at our discretion, including through admin moderation tools.
          </p>

          <h2>Predictions and points</h2>
          <p>
            Predictions and points are free-to-play entertainment. Points have no cash value unless a separate
            sponsored promotion explicitly states otherwise. See internal product legal notes for jurisdiction
            details.
          </p>

          <h2>Disclaimer</h2>
          <p>
            The service is provided &quot;as is&quot; without warranties. We are not liable for indirect or
            consequential damages to the extent permitted by law.
          </p>

          <h2>Contact</h2>
          <p>Use the developer contact email shown on the Google OAuth consent screen for support requests.</p>

          <p className="legal-nav">
            <Link href="/privacy">Privacy Policy</Link>
            {" · "}
            <Link href="/">Back to Kickboard</Link>
          </p>
        </article>
      </main>
    </>
  );
}
