"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { celebrateGoogleLogin } from "@/lib/welcome/celebrate";

/** Confetti and football burst whenever the user signs in with Google (OAuth return). */
export function LoginCelebrationListener() {
  const { status } = useSession();
  const prevStatusRef = useRef(status);

  useEffect(() => {
    if (prevStatusRef.current === "unauthenticated" && status === "authenticated") {
      celebrateGoogleLogin();
    }
    prevStatusRef.current = status;
  }, [status]);

  return null;
}
