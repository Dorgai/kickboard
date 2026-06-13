"use client";

import { useTranslation } from "@/components/locale-provider";
import { useOptionalEventTab } from "@/components/event-tab-provider";
import { useNarrowViewport } from "@/lib/use-narrow-viewport";

export function EventTabSelector() {
  const context = useOptionalEventTab();
  const { t } = useTranslation();
  const mobileLabels = useNarrowViewport(860);

  if (!context) return null;

  const { activeTab, setActiveTab } = context;

  return (
    <nav
      className="event-tab-bar kickboard-tab-bar feed-event-selector-tabs header-event-selector-tabs"
      aria-label={t("eventTabs.feedSelectorAria")}
    >
      <button
        className={activeTab === "current" ? "active" : ""}
        type="button"
        onClick={() => setActiveTab("current")}
      >
        {mobileLabels ? (
          <>
            {t("eventTabs.currentEventLine1")}
            <br />
            {t("eventTabs.currentEventLine2")}
          </>
        ) : (
          t("eventTabs.currentEvent")
        )}
      </button>
      <button
        className={activeTab === "past" ? "active" : ""}
        type="button"
        onClick={() => setActiveTab("past")}
      >
        {mobileLabels ? (
          <>
            {t("eventTabs.pastEventsLine1")}
            <br />
            {t("eventTabs.pastEventsLine2")}
          </>
        ) : (
          t("eventTabs.pastEvents")
        )}
      </button>
    </nav>
  );
}
