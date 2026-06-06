import { useCallback, useRef } from "react";

/** Clears a controlled input on focus so the user can type a new value immediately. */
export function useClearOnFocusInput(value: string, setValue: (next: string) => void) {
  const snapshotRef = useRef<string | null>(null);

  const onFocus = useCallback(() => {
    snapshotRef.current = value;
    setValue("");
  }, [setValue, value]);

  const onBlur = useCallback(() => {
    if (value === "" && snapshotRef.current !== null) {
      setValue(snapshotRef.current);
    }
    snapshotRef.current = null;
  }, [setValue, value]);

  return { onFocus, onBlur };
}
