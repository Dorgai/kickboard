import { useEffect, useRef, type RefObject } from "react";

/**
 * Calls onDismiss when the user presses the pointer outside every container ref
 * (e.g. close a popover when clicking the page).
 */
export function useDismissOnOutsidePointerDown(
  open: boolean,
  onDismiss: () => void,
  containerRefs: Array<RefObject<HTMLElement | null>>
) {
  const containersRef = useRef(containerRefs);
  containersRef.current = containerRefs;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      for (const ref of containersRef.current) {
        if (ref.current?.contains(target)) return;
      }
      onDismiss();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, onDismiss]);
}

export function closeDialogOnBackdropClick(
  event: React.MouseEvent<HTMLDialogElement>,
  close: () => void
) {
  if (event.target === event.currentTarget) {
    close();
  }
}
