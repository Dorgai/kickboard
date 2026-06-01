import { NextRequest } from "next/server";

export const ADMIN_COOKIE = "kickboard_admin_token";

export function readAdminToken({
  authorization,
  cookieToken,
  headerToken,
  queryToken
}: {
  authorization?: string | null;
  cookieToken?: string | null;
  headerToken?: string | null;
  queryToken?: string | null;
}) {
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  return headerToken ?? bearerToken ?? cookieToken ?? queryToken ?? null;
}

function readTokenFromRequest(request: NextRequest) {
  return readAdminToken({
    authorization: request.headers.get("authorization"),
    cookieToken: request.cookies.get(ADMIN_COOKIE)?.value,
    headerToken: request.headers.get("x-admin-token"),
    queryToken: request.nextUrl.searchParams.get("token")
  });
}

export function getAdminAuthStatus() {
  return {
    configured: Boolean(process.env.ADMIN_DATA_SOURCES_TOKEN)
  };
}

export function isAdminRequest(request: NextRequest) {
  const configuredToken = process.env.ADMIN_DATA_SOURCES_TOKEN;
  const requestToken = readTokenFromRequest(request);

  if (!configuredToken || !requestToken) {
    return false;
  }

  return requestToken === configuredToken;
}
