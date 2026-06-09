import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { recordActivityWithPresence } from "@/lib/activity/store";
import { isAdminEmail } from "@/lib/admin/emails";
import { bootstrapAuthEnv, normalizePublicSiteUrl, resolveAuthSecret } from "@/lib/auth/env";
import { findAuthUserById, upsertOAuthUser } from "@/lib/auth/users";
import { normalizeAppLocale } from "@/lib/i18n/locales";

bootstrapAuthEnv();

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

const authSecret = resolveAuthSecret();

if (googleEnabled && !authSecret) {
  console.error(
    "[auth] Google OAuth is enabled but AUTH_SECRET/JWT_SECRET is missing — sign-in will fail with Configuration."
  );
}

/** @deprecated Import from @/lib/auth/env */
export { normalizePublicSiteUrl };

/**
 * Auth.js only reads AUTH_URL / NEXTAUTH_URL for OAuth redirect_uri — not NEXT_PUBLIC_APP_URL.
 * On Railway, the internal Host is often `0.0.0.0:PORT`, which Google rejects (Error 400).
 */
export function ensureAuthUrlEnv(): string {
  return bootstrapAuthEnv();
}

/** Public site URL — required so Google receives the correct redirect_uri (not localhost). */
export function resolveAuthBaseUrl() {
  return bootstrapAuthEnv();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: authSecret || undefined,
  pages: {
    error: "/auth/error"
  },
  providers: googleEnabled
    ? [
        Google({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          allowDangerousEmailAccountLinking: true
        })
      ]
    : [],
  callbacks: {
    async signIn({ profile }) {
      return Boolean(profile?.email);
    },
    async jwt({ token, account, profile, trigger, session }) {
      if (trigger === "update" && token.sub) {
        const user = await findAuthUserById(String(token.sub));
        if (user) {
          token.onboardingComplete = user.onboardingComplete;
          token.pointsBalance = user.pointsBalance;
          if (session && typeof session === "object" && "locale" in session) {
            token.locale = normalizeAppLocale(String((session as { locale?: string }).locale));
          } else {
            token.locale = user.locale;
          }
        }
        return token;
      }

      if (account?.provider && account.providerAccountId && profile?.email) {
        try {
          const user = await upsertOAuthUser({
            email: profile.email,
            displayName: profile.name ?? profile.email.split("@")[0] ?? "Fan",
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            emailVerified: Boolean(
              (profile as { email_verified?: boolean }).email_verified
            )
          });
          if (user) {
            token.sub = user.id;
            token.onboardingComplete = user.onboardingComplete;
            token.pointsBalance = user.pointsBalance;
            token.locale = user.locale;
            token.email = profile.email;
            token.isAdmin = isAdminEmail(profile.email);
            void recordActivityWithPresence({
              userId: user.id,
              eventType: "sign_in",
              summary: "Signed in with Google",
              metadata: { email: profile.email }
            }).catch((error) => {
              console.error("[activity] sign_in", error);
            });
          }
        } catch (error) {
          console.error("[auth] upsertOAuthUser failed after Google sign-in:", error);
          throw error;
        }
      } else if (token.sub) {
        const user = await findAuthUserById(String(token.sub));
        if (user) {
          token.onboardingComplete = user.onboardingComplete;
          token.pointsBalance = user.pointsBalance;
          token.locale = user.locale;
          token.email = user.email;
          token.isAdmin = isAdminEmail(user.email);
        }
      } else if (token.email && typeof token.email === "string") {
        token.isAdmin = isAdminEmail(token.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = String(token.sub);
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.pointsBalance = Number(token.pointsBalance ?? 0);
        session.user.locale = normalizeAppLocale(
          typeof token.locale === "string" ? token.locale : undefined
        );
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    }
  }
});

export function isOAuthConfigured() {
  return googleEnabled;
}

export function isAuthSecretConfigured() {
  return Boolean(authSecret);
}
