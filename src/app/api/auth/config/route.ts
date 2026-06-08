import { NextResponse } from "next/server";
import { isAuthSecretConfigured, isOAuthConfigured, resolveAuthBaseUrl } from "@/auth";
import { getAuthSchemaHealth } from "@/lib/auth/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = resolveAuthBaseUrl();
  const authUrlEnv = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim() || null;
  const nextPublicOnly =
    !authUrlEnv && Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim());
  const authSchema = await getAuthSchemaHealth();

  const privacyPolicyUrl = baseUrl ? `${baseUrl}/privacy` : null;
  const termsUrl = baseUrl ? `${baseUrl}/terms` : null;

  return NextResponse.json({
    oauthConfigured: isOAuthConfigured(),
    sessionSecretConfigured: isAuthSecretConfigured(),
    authTrustHost: process.env.AUTH_TRUST_HOST?.trim() === "true",
    providers: isOAuthConfigured() ? ["google"] : [],
    authBaseUrl: baseUrl || null,
    googleRedirectUri: baseUrl ? `${baseUrl}/api/auth/callback/google` : null,
    privacyPolicyUrl,
    termsUrl,
    applicationHomepageUrl: baseUrl || null,
    /** True when AUTH_URL or NEXTAUTH_URL is set (Auth.js reads these for redirect_uri). */
    authUrlConfigured: Boolean(authUrlEnv),
    /** Set when only NEXT_PUBLIC_APP_URL exists — server patches AUTH_URL at boot if possible. */
    authUrlSyncedFromPublic: nextPublicOnly && Boolean(baseUrl),
    authSchemaReady:
      authSchema.oauthColumnsReady &&
      authSchema.birthYearNullable &&
      authSchema.oauthWriteProbeOk,
    authSchema,
    hint:
      !isAuthSecretConfigured()
        ? "Set AUTH_SECRET or JWT_SECRET on Railway (Auth.js needs a session signing secret)."
        : !authSchema.oauthWriteProbeOk || !authSchema.oauthColumnsReady
          ? authSchema.message
          : nextPublicOnly && baseUrl
            ? "NEXT_PUBLIC_APP_URL was copied to AUTH_URL at runtime. Set AUTH_URL on Railway explicitly."
            : !authUrlEnv && !baseUrl
              ? "Set AUTH_URL to your public site URL (e.g. https://mypicks.live)."
              : null
  });
}
