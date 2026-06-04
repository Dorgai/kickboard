import { Info } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type HelpTooltipProps = {
  /** Accessible name for the help control. */
  label: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label">;

export function HelpTooltip({
  label,
  children,
  className = "",
  size = "md",
  ...buttonProps
}: HelpTooltipProps) {
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button
      aria-label={label}
      className={`info-tooltip info-tooltip--${size}${className ? ` ${className}` : ""}`}
      type="button"
      {...buttonProps}
    >
      <Info aria-hidden className="info-tooltip-icon" size={iconSize} />
      <span className="info-tooltip-bubble" role="tooltip">
        {children}
      </span>
    </button>
  );
}

type PanelHelpRowProps = {
  title: ReactNode;
  helpLabel: string;
  help: ReactNode;
  className?: string;
  titleClassName?: string;
};

/** Section title with a help tooltip (replaces panel lead paragraphs). */
export function PanelHelpRow({
  title,
  helpLabel,
  help,
  className = "",
  titleClassName = ""
}: PanelHelpRowProps) {
  return (
    <div className={`panel-help-row${className ? ` ${className}` : ""}`}>
      <span className={titleClassName || "panel-help-row-title"}>{title}</span>
      <HelpTooltip label={helpLabel} size="sm">
        {help}
      </HelpTooltip>
    </div>
  );
}
