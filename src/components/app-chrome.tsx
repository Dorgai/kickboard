"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { GlobalOverlays } from "@/components/global-overlays";
import { HelpMenu } from "@/components/help-menu";
import { HeaderUserMenu } from "@/components/header-user-menu";
import { NotificationsCenter } from "@/components/notifications-center";
import {
  TournamentSummaryDialog,
  type TournamentSummary
} from "@/components/tournament-summary-dialog";
import { useTranslation } from "@/components/locale-provider";
import { BRAND } from "@/lib/brand";
import { navigation } from "@/lib/kickboard-data";
import {
  handleKickboardCommunityNav,
  handleKickboardHomeNav
} from "@/lib/navigation/location-hash";
import { useLocationHash } from "@/lib/use-location-hash";

type AppChromeProps = {
  activeNav?: "Home" | "Admin";
};

function isCommunityHash(hash: string) {
  return hash === "community" || hash === "coach-board" || hash === "fan-chat";
}

const DEFAULT_EVENT_TITLE = "2026 FIFA World Cup";
const DEFAULT_EVENT_SUMMARY: TournamentSummary = {
  hostCountries: null,
  dates: null,
  teams: null,
  venueCount: null
};

function navLabel(item: (typeof navigation)[number], t: ReturnType<typeof useTranslation>["t"]) {
  return item === "Home" ? t("nav.home") : t("nav.community");
}

export function AppChrome({ activeNav = "Home" }: AppChromeProps) {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const hash = useLocationHash();
  const [eventTitle, setEventTitle] = useState(DEFAULT_EVENT_TITLE);
  const [eventSummary, setEventSummary] = useState<TournamentSummary>(DEFAULT_EVENT_SUMMARY);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentEvent() {
      try {
        const response = await fetch("/api/feeds/current-world-cup", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          title?: string;
          summary?: TournamentSummary;
        };
        if (cancelled) return;
        if (payload.title?.trim()) setEventTitle(payload.title.trim());
        if (payload.summary) setEventSummary(payload.summary);
      } catch {
        /* optional feed */
      }
    }

    void loadCurrentEvent();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="app-header">
      <div className="nav-shell" aria-label={t("nav.primaryAria")}>
        <Link
          className="brand"
          href="/#predictions"
          aria-label={t("nav.homeAria", { brand: BRAND.name })}
          scroll={false}
          onClick={handleKickboardHomeNav}
        >
          <span className="brand-mark" aria-hidden="true">
            {BRAND.shortMark}
          </span>
          <span>{BRAND.wordmark}</span>
        </Link>

        <TournamentSummaryDialog
          summary={eventSummary}
          title={eventTitle}
          triggerClassName="tournament-switcher tournament-switcher--label"
        />

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
                scroll={false}
                onClick={item === "Home" ? handleKickboardHomeNav : handleKickboardCommunityNav}
              >
                {navLabel(item, t)}
              </Link>
            );
          })}
          {session?.user?.isAdmin ? (
            <Link className={activeNav === "Admin" ? "active" : ""} href="/admin/data-sources">
              {t("nav.admin")}
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
