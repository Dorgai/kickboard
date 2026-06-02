import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin/emails";

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

export async function isAdminRequest(request: NextRequest) {
  return isAdminAuthorizedRequest(request);
}

export async function isAdminAuthorizedRequest(request: Request | NextRequest) {
  const configuredToken = process.env.ADMIN_DATA_SOURCES_TOKEN?.trim();
  const requestToken =
    request instanceof NextRequest
      ? readTokenFromRequest(request)
      : readAdminToken({
          authorization: request.headers.get("authorization"),
          cookieToken: null,
          headerToken: request.headers.get("x-admin-token"),
          queryToken: new URL(request.url).searchParams.get("token")
        });

  if (configuredToken && requestToken && requestToken === configuredToken) {
    return true;
  }

  const session = await auth();
  return Boolean(session?.user?.email && isAdminEmail(session.user.email));
}
