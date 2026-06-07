import "next-auth";
import type { AppLocale } from "@/lib/i18n/locales";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboardingComplete: boolean;
      pointsBalance: number;
      locale: AppLocale;
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    onboardingComplete?: boolean;
    pointsBalance?: number;
    locale?: AppLocale;
    isAdmin?: boolean;
    email?: string;
  }
}
