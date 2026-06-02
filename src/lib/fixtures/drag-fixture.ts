export const DRAG_FIXTURE_MIME = "application/x-kickboard-fixture";

export type DragFixturePayload = {
  fixtureKey: string;
};

export function writeFixtureDragData(dataTransfer: DataTransfer, fixtureKey: string) {
  const payload: DragFixturePayload = { fixtureKey };
  const json = JSON.stringify(payload);
  dataTransfer.setData(DRAG_FIXTURE_MIME, json);
  dataTransfer.setData("text/plain", json);
}

export function readFixtureDragData(dataTransfer: DataTransfer): string | null {
  const raw = dataTransfer.getData(DRAG_FIXTURE_MIME) || dataTransfer.getData("text/plain");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DragFixturePayload;
    if (typeof parsed.fixtureKey !== "string" || !parsed.fixtureKey.trim()) return null;
    return parsed.fixtureKey.trim();
  } catch {
    return null;
  }
}

export function isFixtureDragEvent(event: React.DragEvent) {
  return event.dataTransfer.types.includes(DRAG_FIXTURE_MIME);
}
