import { decodePredictionShare, normalizePredictionShareToken } from "@/lib/predictions/share";
import type { PredictionSharePayload } from "@/lib/predictions/share";
import { isShortShareId, loadPredictionShareLink } from "@/lib/predictions/share-store";

export async function resolvePredictionSharePayload(
  rawToken: string | null | undefined
): Promise<PredictionSharePayload | null> {
  const token = normalizePredictionShareToken(rawToken ?? "");
  if (!token) return null;

  if (isShortShareId(token)) {
    const fromDb = await loadPredictionShareLink(token);
    if (fromDb) return fromDb;
    return null;
  }

  return decodePredictionShare(token);
}
