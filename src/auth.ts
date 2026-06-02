import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findAuthUserById, upsertOAuthUser } from "@/lib/auth/users";

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
        const user = await upsertOAuthUser({
          email: profile.email,
          displayName: profile.name ?? profile.email.split("@")[0] ?? "Fan",
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          emailVerified: Boolean(profile.email_verified)
        });
        if (user) {
          token.sub = user.id;
          token.onboardingComplete = user.onboardingComplete;
          token.pointsBalance = user.pointsBalance;
        }
      } else if (token.sub) {
        const user = await findAuthUserById(String(token.sub));
        if (user) {
          token.onboardingComplete = user.onboardingComplete;
          token.pointsBalance = user.pointsBalance;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = String(token.sub);
        session.user.onboardingComplete = Boolean(token.onboardingComplete);
        session.user.pointsBalance = Number(token.pointsBalance ?? 0);
      }
      return session;
    }
  }
});

export function isOAuthConfigured() {
  return googleEnabled;
}
