import { Bell, ChevronDown, Search, ShieldCheck } from "lucide-react";
import { navigation } from "@/lib/kickstats-data";

export function AppChrome() {
  return (
    <header className="app-header">
      <div className="nav-shell" aria-label="Primary navigation">
        <a className="brand" href="#main-content" aria-label="KickStats home">
          <span className="brand-mark" aria-hidden="true">
            KS
          </span>
          <span>KICKSTATS</span>
        </a>

        <button className="tournament-switcher" type="button">
          FIFA World Cup 2026
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        <nav className="nav-tabs">
          {navigation.map((item) => (
            <a key={item} className={item === "Home" ? "active" : ""} href={`#${item.toLowerCase()}`}>
              {item}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
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
