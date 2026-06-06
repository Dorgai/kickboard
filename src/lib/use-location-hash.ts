"use client";

import { useEffect, useState } from "react";
import { readLocationHash, subscribeLocationHash } from "@/lib/navigation/location-hash";

export function useLocationHash(): string {
  const [hash, setHash] = useState("");

  useEffect(() => {
    function sync() {
      setHash(readLocationHash());
    }

    sync();
    return subscribeLocationHash(sync);
  }, []);

  return hash;
}
