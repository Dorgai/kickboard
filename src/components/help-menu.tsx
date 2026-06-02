"use client";

import { CircleHelp, ChevronDown, MessageCircleQuestion, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { OPEN_HELP_CENTER_EVENT, requestHelpCenter, requestWelcomeDialog } from "@/lib/help/events";

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
    <div className="help-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="help-menu-trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <CircleHelp size={18} aria-hidden />
        <span>Help</span>
        <ChevronDown aria-hidden size={14} />
      </button>

      {open ? (
        <div className="help-menu-dropdown" id={menuId} role="menu">
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
