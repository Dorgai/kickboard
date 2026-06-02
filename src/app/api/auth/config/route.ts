import { NextResponse } from "next/server";
import { isOAuthConfigured, resolveAuthBaseUrl } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = resolveAuthBaseUrl();
  return NextResponse.json({
    oauthConfigured: isOAuthConfigured(),
    providers: isOAuthConfigured() ? ["google"] : [],
    authBaseUrl: baseUrl || null,
    googleRedirectUri: baseUrl ? `${baseUrl}/api/auth/callback/google` : null,
    authUrlConfigured: Boolean(
      process.env.AUTH_URL?.trim() ||
        process.env.NEXTAUTH_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim()
    )
  });
}
