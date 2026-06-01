import { NextRequest } from "next/server";

function readTokenFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;

  return request.headers.get("x-admin-token") ?? bearerToken ?? request.nextUrl.searchParams.get("token");
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
