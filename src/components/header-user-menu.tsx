"use client";

import { LogOut, UserRound } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function HeaderUserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="header-user-menu header-user-menu--loading" aria-busy="true">
        <span className="header-user-menu-label">Account…</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <button
        className="header-user-menu header-user-menu--sign-in"
        type="button"
        onClick={() => {
          void signIn("google", {
            callbackUrl: typeof window !== "undefined" ? window.location.href : "/"
          });
        }}
      >
        <UserRound size={16} aria-hidden="true" />
        Sign in
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
              ? `${session.user.pointsBalance} pts`
              : "Complete onboarding"}
          </span>
        </span>
      </div>
      <button
        className="header-user-menu-logout"
        type="button"
        aria-label="Sign out"
        onClick={() => {
          void signOut({ callbackUrl: "/" });
        }}
      >
        <LogOut size={16} aria-hidden="true" />
        <span>Log out</span>
      </button>
    </div>
  );
}
