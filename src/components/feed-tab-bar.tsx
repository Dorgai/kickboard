"use client";

export type FeedTab = {
  id: string;
  label: string;
};

type FeedTabBarProps = {
  tabs: FeedTab[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
};

export function FeedTabBar({ tabs, value, onChange, ariaLabel, className = "" }: FeedTabBarProps) {
  if (!tabs.length) return null;

  return (
    <div
      className={`feed-tab-bar feed-control-bar ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          aria-selected={value === tab.id}
          className={value === tab.id ? "active" : ""}
          role="tab"
          type="button"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
