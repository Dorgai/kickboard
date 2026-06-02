"use client";

import { MessageCircle, X } from "lucide-react";
import { FanChatPanel } from "@/components/fan-chat-panel";

type FloatingFanChatProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FloatingFanChat({ open, onOpenChange }: FloatingFanChatProps) {
  return (
    <div className="fan-chat-float-root" data-open={open ? "true" : "false"}>
      {open ? (
        <button
          aria-label="Close Fan Chat"
          className="fan-chat-float-backdrop"
          type="button"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        aria-label="Fan Chat"
        className={`fan-chat-float-panel${open ? " fan-chat-float-panel--open" : ""}`}
        hidden={!open}
      >
        <header className="fan-chat-float-header">
          <h2>Fan Chat</h2>
          <button
            aria-label="Close"
            className="fan-chat-float-close"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="fan-chat-float-body">
          <FanChatPanel />
        </div>
      </aside>

      <button
        aria-expanded={open}
        className={`fan-chat-float-fab${open ? " fan-chat-float-fab--hidden" : ""}`}
        type="button"
        onClick={() => onOpenChange(true)}
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span>Fan Chat</span>
      </button>
    </div>
  );
}
