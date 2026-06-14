"use client";

import { useTranslation } from "@/components/locale-provider";
import { useOptionalEventTab } from "@/components/event-tab-provider";

type EventTabSelectorProps = {
  /** Header pill on desktop; compact section inside the hamburger menu on mobile. */
  variant?: "header" | "menu";
  onSelected?: () => void;
};

export function EventTabSelector({ variant = "header", onSelected }: EventTabSelectorProps) {
  const context = useOptionalEventTab();
  const { t } = useTranslation();

  if (!context) return null;

  const { activeTab, setActiveTab } = context;

  function selectTab(tab: "current" | "past") {
    setActiveTab(tab);
    onSelected?.();
  }

  if (variant === "menu") {
    return (
      <div className="app-menu-event-tabs" role="group" aria-label={t("eventTabs.feedSelectorAria")}>
        <p className="app-menu-theme-label" id="app-menu-event-tabs-label">
          {t("eventTabs.feedSelectorAria")}
        </p>
        <div aria-labelledby="app-menu-event-tabs-label" className="app-menu-event-tabs-options">
          <button
            aria-pressed={activeTab === "current"}
            className={`app-menu-theme-option${activeTab === "current" ? " app-menu-theme-option--active" : ""}`}
            type="button"
            onClick={() => selectTab("current")}
          >
            {t("eventTabs.currentEvent")}
          </button>
          <button
            aria-pressed={activeTab === "past"}
            className={`app-menu-theme-option${activeTab === "past" ? " app-menu-theme-option--active" : ""}`}
            type="button"
            onClick={() => selectTab("past")}
          >
            {t("eventTabs.pastEvents")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <nav
      className="event-tab-bar kickboard-tab-bar feed-event-selector-tabs header-event-selector-tabs"
      aria-label={t("eventTabs.feedSelectorAria")}
    >
      <button
        className={activeTab === "current" ? "active" : ""}
        type="button"
        onClick={() => selectTab("current")}
      >
        {t("eventTabs.currentEvent")}
      </button>
      <button
        className={activeTab === "past" ? "active" : ""}
        type="button"
        onClick={() => selectTab("past")}
      >
        {t("eventTabs.pastEvents")}
      </button>
    </nav>
  );
}
