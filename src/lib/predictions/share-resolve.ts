import {
  decodeSharePayload,
  normalizePredictionShareToken,
  type SharePayload
} from "@/lib/predictions/share";
import { isShortShareId, loadShareLink } from "@/lib/predictions/share-store";

export async function resolveSharePayload(
  rawToken: string | null | undefined
): Promise<SharePayload | null> {
  const token = normalizePredictionShareToken(rawToken ?? "");
  if (!token) return null;

  if (isShortShareId(token)) {
    const fromDb = await loadShareLink(token);
    if (fromDb) return fromDb;
    return null;
  }

  return decodeSharePayload(token);
}

/** @deprecated Use resolveSharePayload */
export async function resolvePredictionSharePayload(
  rawToken: string | null | undefined
): Promise<SharePayload | null> {
  return resolveSharePayload(rawToken);
}
