"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  CURRENT_EVENT_HASHES,
  PAST_EVENT_HASHES,
  type EventTab
} from "@/lib/navigation/event-tab-hashes";
import { requestFanChat } from "@/lib/help/events";
import {
  readLocationHash,
  subscribeLocationHash,
  writeLocationHash
} from "@/lib/navigation/location-hash";

type EventTabContextValue = {
  activeTab: EventTab;
  setActiveTab: (tab: EventTab) => void;
};

const EventTabContext = createContext<EventTabContextValue | null>(null);

export function EventTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<EventTab>("current");

  useEffect(() => {
    function syncTabFromHash() {
      const hash = readLocationHash();
      if (hash === "fan-chat") {
        setActiveTab("current");
        requestFanChat();
        writeLocationHash("predictions", { replace: true });
        return;
      }
      if (hash && CURRENT_EVENT_HASHES.has(hash)) {
        setActiveTab("current");
        return;
      }
      if (hash && PAST_EVENT_HASHES.has(hash)) {
        setActiveTab("past");
      }
    }

    syncTabFromHash();
    return subscribeLocationHash(syncTabFromHash);
  }, []);

  const setActiveTabStable = useCallback((tab: EventTab) => {
    setActiveTab(tab);
  }, []);

  const value = useMemo(
    () => ({ activeTab, setActiveTab: setActiveTabStable }),
    [activeTab, setActiveTabStable]
  );

  return <EventTabContext.Provider value={value}>{children}</EventTabContext.Provider>;
}

export function useOptionalEventTab() {
  return useContext(EventTabContext);
}

export function useEventTab() {
  const context = useOptionalEventTab();
  if (!context) {
    throw new Error("useEventTab must be used within EventTabProvider");
  }
  return context;
}
