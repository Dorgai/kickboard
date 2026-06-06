"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FanChatPanel } from "@/components/fan-chat-panel";
import {
  useDismissOnEscape,
  useDismissOnOutsidePointerDown
} from "@/lib/use-dismiss-on-outside-pointer-down";

type FloatingFanChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FloatingFanChat({ open, onOpenChange }: FloatingFanChatProps) {
  const panelRef = useRef<HTMLElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const close = () => onOpenChange(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useDismissOnOutsidePointerDown(open, close, [panelRef, fabRef]);
  useDismissOnEscape(open, close);

  if (!mounted) return null;

  return createPortal(
    <div className="fan-chat-float-root" data-open={open ? "true" : "false"}>
      {open ? (
        <>
          <button
            aria-label="Close Fan Chat"
            className="fan-chat-float-backdrop"
            type="button"
            onClick={close}
          />
          <aside
            ref={panelRef}
            aria-label="Fan Chat"
            className="fan-chat-float-panel fan-chat-float-panel--open"
          >
            <header className="fan-chat-float-header">
              <h2>Fan Chat</h2>
              <button
                aria-label="Close"
                className="fan-chat-float-close"
                type="button"
                onClick={close}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="fan-chat-float-body">
              <FanChatPanel />
            </div>
          </aside>
        </>
      ) : null}

      <button
        ref={fabRef}
        aria-expanded={open}
        className={`fan-chat-float-fab${open ? " fan-chat-float-fab--hidden" : ""}`}
        type="button"
        onClick={() => onOpenChange(true)}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>Fan Chat</span>
      </button>
    </div>,
    document.body
  );
}
