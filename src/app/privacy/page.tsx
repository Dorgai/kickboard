import Link from "next/link";
import { AppChrome } from "@/components/app-chrome";

export const metadata = {
  title: "Privacy Policy | Kickboard",
  description: "How Kickboard collects and uses account and usage data."
};

export default function PrivacyPage() {
  const updated = "June 2026";

  return (
    <>
      <AppChrome />
      <main className="legal-page" id="main-content">
        <article className="legal-document">
          <p className="eyebrow">Legal</p>
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: {updated}</p>

          <p>
            Kickboard (&quot;we&quot;, &quot;the platform&quot;) is a fan and analytics experience for football
            tournaments. This policy describes what we collect when you use the website and how we use it.
          </p>

          <h2>Who operates Kickboard</h2>
          <p>
            The service is operated by the Kickboard project team. For privacy requests, contact the address
            listed on the Google OAuth consent screen as the developer contact email.
          </p>

          <h2>Information we collect</h2>
          <ul>
            <li>
              <strong>Google sign-in:</strong> When you choose &quot;Continue with Google&quot;, we receive your
              Google account email, display name, and profile identifier from Google. We do not receive your
              Google password.
            </li>
            <li>
              <strong>Account data:</strong> Username, display name, birth year (for age rules), points balance,
              squads, predictions, community posts, connection requests, Fan Chat messages, and notification
              preferences stored in our database.
            </li>
            <li>
              <strong>Technical data:</strong> Standard server logs (IP address, browser type, timestamps) for
              security and operations.
            </li>
          </ul>

          <h2>How we use information</h2>
          <ul>
            <li>Authenticate you and keep you signed in.</li>
            <li>Provide Coach Board, Fan Chat, predictions, and community features you request.</li>
            <li>Enforce child-safety rules (accounts under 13 cannot post publicly).</li>
            <li>Moderate content and respond to abuse reports.</li>
            <li>Improve reliability and fix errors.</li>
          </ul>

          <h2>Legal bases (EEA/UK)</h2>
          <p>
            We process account data to perform our contract with you (providing the service) and for legitimate
            interests (security, moderation, analytics). Where required, we rely on your consent for optional
            features.
          </p>

          <h2>Sharing</h2>
          <p>We do not sell your personal data. We share data only with:</p>
          <ul>
            <li>
              <strong>Service providers</strong> that host the application and database (for example Railway
              and Google Cloud for sign-in).
            </li>
            <li>
              <strong>Other users</strong> when you post publicly, message connections, or share squads — only
              what you choose to share.
            </li>
            <li>
              <strong>Authorities</strong> when required by law.
            </li>
          </ul>

          <h2>Retention</h2>
          <p>
            We keep account data while your account is active. You may request deletion; we may retain minimal
            logs where required for legal or security reasons.
          </p>

          <h2>Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, or export your data, and
            to object to certain processing. Contact us using the developer email on the OAuth consent screen.
          </p>

          <h2>Children</h2>
          <p>
            The service is not directed at children under 13. We block public posting for under-13 accounts (Fan
            Mode). Parents who believe a child has registered should contact us for removal.
          </p>

          <h2>Changes</h2>
          <p>We may update this policy. The &quot;Last updated&quot; date at the top will change when we do.</p>

          <p className="legal-nav">
            <Link href="/terms">Terms of Use</Link>
            {" · "}
            <Link href="/">Back to Kickboard</Link>
          </p>
        </article>
      </main>
    </>
  );
}
