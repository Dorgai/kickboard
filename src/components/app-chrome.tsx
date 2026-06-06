"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { MouseEvent } from "react";
import { GlobalOverlays } from "@/components/global-overlays";
import { HelpMenu } from "@/components/help-menu";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { NotificationsCenter } from "@/components/notifications-center";
import { navigation } from "@/lib/kickboard-data";
import { navigateToCommunity, navigateToHome } from "@/lib/navigation/location-hash";
import { useLocationHash } from "@/lib/use-location-hash";

type AppChromeProps = {
  activeNav?: "Home" | "Admin";
};

function isCommunityHash(hash: string) {
  return hash === "community" || hash === "coach-board" || hash === "fan-chat";
}

function onHomeNavClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  navigateToHome();
}

function onCommunityNavClick(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  navigateToCommunity();
}

export function AppChrome({ activeNav = "Home" }: AppChromeProps) {
  const { data: session } = useSession();
  const hash = useLocationHash();

  return (
    <header className="app-header">
      <div className="nav-shell" aria-label="Primary navigation">
        <Link
          className="brand"
          href="/#predictions"
          aria-label="Kickboard home"
          onClick={onHomeNavClick}
        >
          <span className="brand-mark" aria-hidden="true">
            KB
          </span>
          <span>KICKBOARD</span>
        </Link>

        <span className="tournament-switcher tournament-switcher--label">FIFA World Cup 2026</span>

        <nav className="nav-tabs">
          {navigation.map((item) => {
            const isActive =
              activeNav === "Home" &&
              (item === "Home" ? !isCommunityHash(hash) : isCommunityHash(hash));
            return (
              <Link
                key={item}
                className={isActive ? "active" : ""}
                href={item === "Home" ? "/#predictions" : "/#community"}
                onClick={item === "Home" ? onHomeNavClick : onCommunityNavClick}
              >
                {item}
              </Link>
            );
          })}
          {session?.user?.isAdmin ? (
            <Link className={activeNav === "Admin" ? "active" : ""} href="/admin/data-sources">
              Admin
            </Link>
          ) : null}
        </nav>

        <div className="nav-actions">
          <HelpMenu />
          <NotificationsCenter />
          <HeaderUserMenu />
        </div>
      </div>
      <GlobalOverlays />
    </header>
  );
}
