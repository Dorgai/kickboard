"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { consumePendingLoginCelebration } from "@/lib/auth/login-celebrate-flag";
import { celebrateGoogleLogin } from "@/lib/welcome/celebrate";

/** Confetti and football burst when the user returns from Google OAuth (or signs in in-tab). */
export function LoginCelebrationListener() {
  const { status } = useSession();
  const prevStatusRef = useRef(status);
  const celebratedRef = useRef(false);

  useEffect(() => {
    const was = prevStatusRef.current;
    prevStatusRef.current = status;

    if (status !== "authenticated" || celebratedRef.current) return;

    const oauthReturn = consumePendingLoginCelebration();
    const signedInInTab = was === "unauthenticated";

    if (!oauthReturn && !signedInInTab) return;

    celebratedRef.current = true;
    const timer = window.setTimeout(() => celebrateGoogleLogin(), 150);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      celebratedRef.current = false;
    }
  }, [status]);

  return null;
}
