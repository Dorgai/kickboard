"use client";

import { Bell, ChevronDown, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeSelector } from "@/components/theme-selector";
import { navigation } from "@/lib/kickboard-data";

type AppChromeProps = {
  activeNav?: "Home" | "Admin";
};

const PAST_EVENT_HASHES = new Set(["bracket", "squads", "players", "community", "analytics"]);

export function AppChrome({ activeNav = "Home" }: AppChromeProps) {
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
          <span className="brand-mark" aria-hidden="true">
            KB
          </span>
          <span>KICKBOARD</span>
        </Link>

        <button className="tournament-switcher" type="button">
          FIFA World Cup 2026
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        <nav className="nav-tabs">
          {navigation.map((item) => {
            const slug = item.toLowerCase();
            const isActive =
              activeNav === "Home" &&
              (item === "Home"
                ? !hash || hash === "home"
                : PAST_EVENT_HASHES.has(hash) && hash === slug);
            return (
              <Link
                key={item}
                className={isActive ? "active" : ""}
                href={item === "Home" ? "/" : `/#${slug}`}
              >
                {item}
              </Link>
            );
          })}
          <Link className={activeNav === "Admin" ? "active" : ""} href="/admin/data-sources">
            Admin
          </Link>
        </nav>

        <div className="nav-actions">
          <ThemeSelector />
          <button type="button" aria-label="Open global search">
            <Search size={18} aria-hidden="true" />
          </button>
          <button className="notification-button" type="button" aria-label="Open notifications">
            <Bell size={18} aria-hidden="true" />
            <span aria-label="3 unread notifications">3</span>
          </button>
          <div className="tier-badge">
            <ShieldCheck size={16} aria-hidden="true" />
            Safe MVP
          </div>
        </div>
      </div>
    </header>
  );
}
