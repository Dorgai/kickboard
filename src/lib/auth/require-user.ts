import { auth } from "@/auth";
import { findAuthUserById, type AuthUser } from "@/lib/auth/users";

export async function requireAuthUser(): Promise<AuthUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return findAuthUserById(session.user.id);
}
