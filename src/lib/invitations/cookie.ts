import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const REGISTRATION_INVITE_COOKIE = "kickboard_registration_invite";

type InviteCookiePayload = {
  token: string;
  exp: number;
};

function secret() {
  const value = process.env.JWT_SECRET?.trim();
  if (!value) throw new Error("JWT_SECRET_NOT_CONFIGURED");
  return value;
}

function encodePayload(payload: InviteCookiePayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

export function createRegistrationInviteCookieValue(inviteToken: string, maxAgeSeconds = 60 * 60 * 24 * 14) {
  const payload: InviteCookiePayload = {
    token: inviteToken.trim(),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
  };
  const body = encodePayload(payload);
  return `${body}.${sign(body)}`;
}

export function readRegistrationInviteCookieValue(value: string | null | undefined) {
  if (!value) return null;

  const [body, signature] = value.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as InviteCookiePayload;
    if (!payload.token || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.token;
  } catch {
    return null;
  }
}

export async function getRegistrationInviteTokenFromCookies() {
  const cookieStore = await cookies();
  return readRegistrationInviteCookieValue(cookieStore.get(REGISTRATION_INVITE_COOKIE)?.value);
}

export function registrationInviteCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 14) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  };
}
