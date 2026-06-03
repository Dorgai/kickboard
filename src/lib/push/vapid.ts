export function getVapidPublicKey(): string | null {
  const key =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim() ||
    "";
  return key || null;
}

export function isWebPushConfigured(): boolean {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() ?? "";
  return Boolean(publicKey && privateKey && subject);
}

export function getVapidSubject(): string {
  return process.env.VAPID_SUBJECT?.trim() || "mailto:support@kickboard.app";
}
