"use client";

import {
  CircleHelp,
  ChevronDown,
  Menu,
  MessageCircleQuestion,
  Sparkles,
  Users
} from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { ThemeSelector } from "@/components/theme-selector";
import { OPEN_HELP_CENTER_EVENT, requestHelpCenter, requestWelcomeDialog } from "@/lib/help/events";
import { navigateToCommunity } from "@/lib/navigation/location-hash";

export function HelpMenu() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="help-menu app-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="help-menu-trigger app-menu-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <Menu size={18} aria-hidden />
        <span className="app-menu-trigger-label">Menu</span>
        <ChevronDown aria-hidden size={14} />
      </button>

      {open ? (
        <div className="help-menu-dropdown app-menu-dropdown" id={menuId} role="menu">
          <ThemeSelector variant="menu" />
          <div className="app-menu-divider" role="separator" />
          <p className="app-menu-section-label">Navigate</p>
          <Link
            className="help-menu-item"
            href="/#community"
            role="menuitem"
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              setOpen(false);
              navigateToCommunity();
            }}
          >
            <Users size={16} aria-hidden />
            Community
          </Link>
          <div className="app-menu-divider" role="separator" />
          <p className="app-menu-section-label">Help</p>
          <button
            className="help-menu-item"
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              requestWelcomeDialog();
            }}
          >
            <Sparkles size={16} aria-hidden />
            Welcome tour
          </button>
          <button
            className="help-menu-item"
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              requestHelpCenter({ channel: "ai" });
            }}
          >
            <MessageCircleQuestion size={16} aria-hidden />
            Ask Kickboard AI
          </button>
          <button
            className="help-menu-item"
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              requestHelpCenter({ channel: "admin" });
            }}
          >
            <CircleHelp size={16} aria-hidden />
            Ask an admin
          </button>
        </div>
      ) : null}
    </div>
  );
}
