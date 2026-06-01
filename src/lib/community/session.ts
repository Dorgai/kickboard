import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const COMMUNITY_COOKIE = "kickboard_community_session";

type CommunitySessionPayload = {
  userId: string;
  exp: number;
};

function secret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return value;
}

function encodePayload(payload: CommunitySessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createCommunitySessionToken(userId: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const payload: CommunitySessionPayload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const body = encodePayload(payload);
  return `${body}.${sign(body)}`;
}

export function readCommunitySessionToken(token: string | null | undefined) {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CommunitySessionPayload;
    if (!payload.userId || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getCommunitySessionUserId() {
  const cookieStore = await cookies();
  const payload = readCommunitySessionToken(cookieStore.get(COMMUNITY_COOKIE)?.value);
  return payload?.userId ?? null;
}

export function communitySessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 30) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}
