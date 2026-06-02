import { auth } from "@/auth";
import { readAdminToken } from "@/lib/admin/auth";
import { isAdminEmail } from "@/lib/admin/emails";

export type AdminAuthContext =
  | { method: "token" }
  | { method: "oauth"; userId: string; email: string };

export async function requireAdminAuth(
  request: Request
): Promise<AdminAuthContext | null> {
  const configuredToken = process.env.ADMIN_DATA_SOURCES_TOKEN?.trim();
  const requestToken = readAdminToken({
    authorization: request.headers.get("authorization"),
    cookieToken: null,
    headerToken: request.headers.get("x-admin-token"),
    queryToken: new URL(request.url).searchParams.get("token")
  });

  if (configuredToken && requestToken && requestToken === configuredToken) {
    return { method: "token" };
  }

  const session = await auth();
  const email = session?.user?.email;
  if (session?.user?.id && email && isAdminEmail(email)) {
    return { method: "oauth", userId: session.user.id, email };
  }

  return null;
}

export async function isOAuthAdminSession(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.user?.email && isAdminEmail(session.user.email));
}
