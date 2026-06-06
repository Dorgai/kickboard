import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { recordActivityWithPresence } from "@/lib/activity/store";
import { isAdminEmail } from "@/lib/admin/emails";
import { findAuthUserById, upsertOAuthUser } from "@/lib/auth/users";

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

/** Strip trailing slash and accidental double schemes (e.g. https://https://mypicks.live). */
export function normalizePublicSiteUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, "");
  if (!normalized) return "";

  normalized = normalized.replace(/^(https?:\/\/)+/i, "https://");
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

/**
 * Auth.js only reads AUTH_URL / NEXTAUTH_URL for OAuth redirect_uri — not NEXT_PUBLIC_APP_URL.
 * On Railway, the internal Host is often `0.0.0.0:PORT`, which Google rejects (Error 400).
 */
export function ensureAuthUrlEnv(): string {
  const existing = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (existing) {
    const normalized = normalizePublicSiteUrl(existing);
    if (normalized !== existing.replace(/\/+$/, "")) {
      process.env.AUTH_URL = normalized;
    }
    return normalized;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL?.trim() || "";
  const normalized = normalizePublicSiteUrl(fallback);
  if (normalized) {
    process.env.AUTH_URL = normalized;
  }
  return normalized;
}

/** Public site URL — required so Google receives the correct redirect_uri (not localhost). */
export function resolveAuthBaseUrl() {
  return ensureAuthUrlEnv();
}

const authBaseUrl = ensureAuthUrlEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  /** Forces Google redirect_uri to the public site (Railway Host is often 0.0.0.0:PORT). */
  ...(authBaseUrl ? { redirectProxyUrl: `${authBaseUrl}/api/auth` } : {}),
  secret: process.env.AUTH_SECRET?.trim() || process.env.JWT_SECRET?.trim(),
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
    async jwt({ token, account, profile }) {
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
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    }
  }
});

export function isOAuthConfigured() {
  return googleEnabled;
}
