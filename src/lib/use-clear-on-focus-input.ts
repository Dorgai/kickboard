import { useCallback, useRef } from "react";

function sanitizeScoreDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 2);
}

/** Clears a controlled score input on focus so the user can type a new value immediately. */
export function useClearOnFocusInput(value: string, setValue: (next: string) => void) {
  const snapshotRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  const beginEdit = useCallback(
    (target: HTMLInputElement) => {
      if (snapshotRef.current !== null) return;
      snapshotRef.current = value;
      dirtyRef.current = false;
      setValue("");
      requestAnimationFrame(() => {
        target.select();
      });
    },
    [setValue, value]
  );

  const onFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      beginEdit(event.currentTarget);
    },
    [beginEdit]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLInputElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      beginEdit(event.currentTarget);
    },
    [beginEdit]
  );

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      dirtyRef.current = true;
      setValue(sanitizeScoreDigits(event.target.value));
    },
    [setValue]
  );

  const onBlur = useCallback(() => {
    if (dirtyRef.current) {
      snapshotRef.current = null;
      dirtyRef.current = false;
      return;
    }
    if (snapshotRef.current !== null) {
      setValue(snapshotRef.current);
    }
    snapshotRef.current = null;
  }, [setValue]);

  return { onFocus, onPointerDown, onChange, onBlur };
}
