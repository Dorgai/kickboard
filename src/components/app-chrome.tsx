"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { GlobalOverlays } from "@/components/global-overlays";
import { HelpMenu } from "@/components/help-menu";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { NotificationsCenter } from "@/components/notifications-center";
import { ThemeSelector } from "@/components/theme-selector";
import { navigation } from "@/lib/kickboard-data";

type AppChromeProps = {
  activeNav?: "Home" | "Admin";
};

function isCommunityHash(hash: string) {
  return hash === "community" || hash === "coach-board" || hash === "fan-chat";
}

export function AppChrome({ activeNav = "Home" }: AppChromeProps) {
  const { data: session } = useSession();
  const [hash, setHash] = useState("");

  useEffect(() => {
    function updateHash() {
      setHash(window.location.hash.replace(/^#/, "").toLowerCase());
    }
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, []);

  return (
    <header className="app-header">
      <div className="nav-shell" aria-label="Primary navigation">
        <Link className="brand" href="/" aria-label="Kickboard home">
          <img alt="" className="brand-logo" height={40} src="/logo.svg" width={40} />
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
                href={item === "Home" ? "/" : "/#community"}
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
          <ThemeSelector />
          <NotificationsCenter />
          <HeaderUserMenu />
        </div>
      </div>
      <GlobalOverlays />
    </header>
  );
}
