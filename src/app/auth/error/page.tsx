import Link from "next/link";
import { AppChrome } from "@/components/app-chrome";

type AuthErrorPageProps = {
  searchParams: Promise<{ error?: string }>;
};

function describeAuthError(code: string | undefined) {
  switch (code) {
    case "Configuration":
      return {
        title: "Sign-in configuration problem",
        body: (
          <>
            <p>
              The server could not start Google sign-in. This is usually temporary — try again in a
              moment.
            </p>
            <p>If it keeps happening:</p>
            <ul>
              <li>
                Use <strong>https://mypicks.live</strong> (not an old Railway preview URL).
              </li>
              <li>Clear cookies for this site or try a private window.</li>
              <li>
                Check{" "}
                <a href="/api/auth/config" rel="noopener noreferrer" target="_blank">
                  /api/auth/config
                </a>{" "}
                — <code>oauthConfigured</code> and <code>sessionSecretConfigured</code> should be{" "}
                <code>true</code>.
              </li>
            </ul>
          </>
        )
      };
    case "AccessDenied":
      return {
        title: "Sign-in was blocked",
        body: (
          <p>
            Google or MyPicks denied this sign-in. If the Google app is still in <strong>Testing</strong>{" "}
            mode, your Gmail must be listed under Test users, or the app must be published for
            production.
          </p>
        )
      };
    case "OAuthCallback":
    case "Callback":
      return {
        title: "Google sign-in did not finish",
        body: (
          <p>
            Something went wrong after Google redirected back. Clear site cookies and try again. If
            you opened the site in multiple tabs, close extras and sign in once.
          </p>
        )
      };
    case "OAuthSignin":
    case "OAuthCreateAccount":
      return {
        title: "Could not reach Google",
        body: <p>We could not start the Google sign-in flow. Check your connection and try again.</p>
      };
    default:
      return {
        title: "Sign-in error",
        body: (
          <p>
            {code
              ? `Google sign-in returned: ${code}.`
              : "Something went wrong during sign-in."}{" "}
            Try again, or use a private window if you recently switched accounts.
          </p>
        )
      };
  }
}

export const metadata = {
  title: "Sign-in error | MyPicks",
  robots: { index: false, follow: false }
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error } = await searchParams;
  const { title, body } = describeAuthError(error);

  return (
    <>
      <AppChrome />
      <main className="legal-page" id="main-content">
        <article className="legal-document auth-error-page">
          <p className="eyebrow">Account</p>
          <h1>{title}</h1>
          {body}
          <p className="auth-error-actions">
            <Link className="button primary" href="/#predictions">
              Back to MyPicks
            </Link>
            <Link className="button secondary" href="/api/auth/signin">
              Try sign-in again
            </Link>
          </p>
        </article>
      </main>
    </>
  );
}
