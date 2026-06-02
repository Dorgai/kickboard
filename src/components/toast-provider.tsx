"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode
} from "react";

export type ToastVariant = "success" | "info" | "warning";

export type ToastInput = {
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  exiting?: boolean;
};

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4800;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const regionId = useId();
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((current) =>
      current.map((toast) => (toast.id === id ? { ...toast, exiting: true } : toast))
    );
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      const timer = timersRef.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
    }, 320);
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const toast: ToastItem = {
        id,
        message: input.message,
        variant: input.variant ?? "info",
        durationMs: input.durationMs ?? DEFAULT_DURATION
      };

      setToasts((current) => [...current.slice(-4), toast]);

      const timer = window.setTimeout(() => dismiss(id), toast.durationMs);
      timersRef.current.set(id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="toast-stack"
        id={regionId}
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            className={`toast-item toast-item--${toast.variant ?? "info"}${toast.exiting ? " toast-item--exit" : ""}`}
            key={toast.id}
            role="status"
          >
            <p>{toast.message}</p>
            <button
              aria-label="Dismiss"
              className="toast-item-dismiss"
              type="button"
              onClick={() => dismiss(toast.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/** Safe when ToastProvider may be absent (returns no-op). */
export function useToastOptional() {
  return useContext(ToastContext);
}
