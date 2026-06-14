"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "@/components/locale-provider";

type CopyLinkButtonProps = {
  text: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onCopied?: () => void;
  onError?: (message: string) => void;
};

export function CopyLinkButton({
  text,
  disabled = false,
  compact = false,
  className = "",
  onCopied,
  onError
}: CopyLinkButtonProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      onError?.(t("invitations.copyFailed"));
    }
  }

  return (
    <button
      className={`button secondary copy-link-button${compact ? " copy-link-button--compact" : ""}${
        copied ? " copy-link-button--copied" : ""
      }${className ? ` ${className}` : ""}`}
      aria-live="polite"
      disabled={disabled}
      type="button"
      onClick={() => void handleCopy()}
    >
      {copied ? <Check aria-hidden size={16} /> : <Copy aria-hidden size={16} />}
      <span>{copied ? t("common.copied") : compact ? t("common.copy") : t("common.copyLink")}</span>
    </button>
  );
}
