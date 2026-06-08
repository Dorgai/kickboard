"use client";

import { LogOut, UserRound } from "lucide-react";
import { useTranslation } from "@/components/locale-provider";
import { signIn, signOut, useSession } from "next-auth/react";
import { resolveSignInCallbackUrl } from "@/lib/auth/sign-in";

export function HeaderUserMenu() {
  const { data: session, status } = useSession();
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <div className="header-user-menu header-user-menu--loading" aria-busy="true">
        <span className="header-user-menu-label">{t("common.accountLoading")}</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        className="header-user-menu header-user-menu--sign-in"
        type="button"
        onClick={() => {
          void (async () => {
            try {
              const response = await fetch("/api/auth/config", { cache: "no-store" });
              const config = (await response.json()) as {
                oauthConfigured?: boolean;
                sessionSecretConfigured?: boolean;
              };
              if (!config.oauthConfigured || !config.sessionSecretConfigured) {
                window.location.assign("/auth/error?error=Configuration");
                return;
              }
            } catch {
              /* proceed */
            }
            await signIn("google", {
              callbackUrl: resolveSignInCallbackUrl("/")
            });
          })();
        }}
      >
        <UserRound size={16} aria-hidden="true" />
        <span className="header-user-menu-sign-in-label">{t("auth.signIn")}</span>
      </button>
    );
  }

  const displayName = session.user.name ?? session.user.email ?? "Fan";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="header-user-menu header-user-menu--signed-in">
      <div className="header-user-menu-identity" title={session.user.email ?? displayName}>
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- Google OAuth avatar host varies
          <img alt="" className="header-user-menu-avatar" height={32} src={session.user.image} width={32} />
        ) : (
          <span aria-hidden="true" className="header-user-menu-avatar header-user-menu-avatar--initials">
            {initials}
          </span>
        )}
        <span className="header-user-menu-text">
          <span className="header-user-menu-name">{displayName}</span>
          <span className="header-user-menu-meta">
            {session.user.onboardingComplete
              ? t("auth.points", { count: session.user.pointsBalance })
              : t("auth.completeOnboarding")}
          </span>
        </span>
      </div>
      <button
        className="header-user-menu-logout"
        type="button"
        aria-label={t("auth.signOutAria")}
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        <LogOut size={16} aria-hidden="true" />
        <span>{t("auth.logOut")}</span>
      </button>
    </div>
  );
}
