"use client";

import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { HelpTooltip } from "@/components/help-tooltip";
import { LanguageSelector } from "@/components/language-selector";
import { useLocale, useTranslation } from "@/components/locale-provider";
import { suggestUsernameFromLabel } from "@/lib/auth/username";
import { writeLocaleCookie } from "@/lib/i18n/cookie";
import { normalizeAppLocale, type AppLocale } from "@/lib/i18n/locales";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type AuthConfig = {
  oauthConfigured: boolean;
  providers: string[];
};

export function AuthGate({
  children,
  featureLabel
}: {
  children: React.ReactNode;
  featureLabel: string;
}) {
  const { data: session, status, update } = useSession();
  const { t } = useTranslation();
  const { setLocale } = useLocale();
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 18));
  const [username, setUsername] = useState("");
  const [selectedLocale, setSelectedLocale] = useState<AppLocale>("en");
  const suggestedUsername = useMemo(
    () => suggestUsernameFromLabel(session?.user?.name),
    [session?.user?.name]
  );
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/config")
      .then((response) => response.json())
      .then((payload: AuthConfig) => setOauthConfigured(payload.oauthConfigured))
      .catch(() => setOauthConfigured(null));
  }, []);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.onboardingComplete) return;

    void fetch("/api/locale/suggest", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { locale?: string }) => {
        setSelectedLocale(normalizeAppLocale(payload.locale));
      })
      .catch(() => undefined);
  }, [session?.user?.onboardingComplete, status]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.onboardingComplete) return;

    void fetch("/api/invitations/redeem", { method: "POST" }).catch(() => {
      /* invite cookie absent or already redeemed */
    });
  }, [session?.user?.onboardingComplete, status]);

  if (status === "loading") {
    return <p className="inline-status">{t("common.checkingSignIn")}</p>;
  }

  if (!session?.user) {
    return (
      <div className="auth-gate">
        <h3 className="panel-help-row">
          {t("auth.signInToUse", { feature: featureLabel })}
          <HelpTooltip label={t("auth.signInWhy")} size="sm">
            {t("auth.signInWhyBody")}
          </HelpTooltip>
        </h3>
        {oauthConfigured === false ? (
          <div className="auth-oauth-setup-help">
            <p className="inline-status">{t("auth.oauthNotConfigured")}</p>
            <ul className="auth-oauth-setup-list">
              <li>
                <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> from Google Cloud Console
              </li>
              <li>
                Redirect URI:{" "}
                <code>
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/api/auth/callback/google`
                    : "/api/auth/callback/google"}
                </code>
              </li>
            </ul>
            <p className="community-setup-note">
              <strong>Only testers can sign in?</strong> In Google Cloud → OAuth consent screen, click{" "}
              <strong>Publish app</strong> (leave Testing mode). Add{" "}
              <a href="/privacy">Privacy Policy</a> and your site URL there — see{" "}
              <code>docs/publish-production.md</code>.
            </p>
            <p className="community-setup-note">
              If Google shows &quot;Access blocked&quot; while still in Testing, add Gmail under{" "}
              <strong>Test users</strong>. Set Railway <code>AUTH_URL</code> to this site and check{" "}
              <a href="/api/auth/providers">/api/auth/providers</a> (callback must not be <code>0.0.0.0</code>).
            </p>
          </div>
        ) : (
          <GoogleSignInButton />
        )}
      </div>
    );
  }

  if (!session.user.onboardingComplete) {
    async function handleOnboarding(event: FormEvent) {
      event.preventDefault();
      setSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            birthYear: Number(birthYear),
            locale: selectedLocale,
            username: username.trim() || null
          })
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? t("auth.onboardingFailed"));
        writeLocaleCookie(selectedLocale);
        await update({ locale: selectedLocale });
      } catch (onboardingError) {
        setError(onboardingError instanceof Error ? onboardingError.message : t("auth.onboardingFailed"));
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <form className="auth-gate" onSubmit={handleOnboarding}>
        <h3 className="panel-help-row">
          {t("auth.confirmAge")}
          <HelpTooltip label={t("auth.confirmAgeWhy")} size="sm">
            {t("auth.confirmAgeWhyBody")}
          </HelpTooltip>
        </h3>
        <LanguageSelector
          variant="onboarding"
          value={selectedLocale}
          onSelect={(locale) => {
            const next = normalizeAppLocale(locale);
            setSelectedLocale(next);
            void setLocale(next, { persist: false, reload: false });
          }}
        />
        <label className="feed-control-field">
          {t("auth.username")}
          <span className="feed-control-hint">{t("auth.usernameHint")}</span>
          <input
            autoCapitalize="none"
            autoComplete="username"
            className="feed-control-input"
            maxLength={30}
            placeholder={
              suggestedUsername
                ? t("auth.usernamePlaceholder", { example: suggestedUsername })
                : t("auth.usernamePlaceholderGeneric")
            }
            spellCheck={false}
            type="text"
            value={username}
            onChange={(event) =>
              setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
          />
        </label>
        <label className="feed-control-field">
          {t("auth.birthYear")}
          <input
            className="feed-control-input"
            max={new Date().getFullYear()}
            min={1900}
            required
            type="number"
            value={birthYear}
            onChange={(event) => setBirthYear(event.target.value)}
          />
        </label>
        {error ? <p className="inline-status">{error}</p> : null}
        <button className="button primary" disabled={submitting} type="submit">
          {submitting ? t("common.saving") : t("common.continue")}
        </button>
      </form>
    );
  }

  return <div className="auth-gate-shell">{children}</div>;
}
