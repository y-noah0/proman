"use client";

import { useState, useCallback, ReactNode, useRef } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

let toastCallbacks: {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
} | null = null;

/**
 * Global toast function that can be called from anywhere
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration = 5000,
): void {
  if (toastCallbacks) {
    toastCallbacks.addToast(message, type, duration);
  }
}

/**
 * Hook to manage toast notifications
 */
export function useToast(): ToastContextType {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 5000) => {
      const id = `toast-${Date.now()}-${++idRef.current}`;
      const toast: Toast = { id, message, type, duration };

      setToasts((current) => [...current, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((current) =>
            current.filter((t) => t.id !== id),
          );
        }, duration);
      }
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  // Register the global callback
  if (!toastCallbacks) {
    toastCallbacks = { addToast };
  }

  return { toasts, addToast, removeToast };
}

/**
 * Toast container component - displays all active toasts
 */
export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}): ReactNode {
  const getToastStyles = (type: ToastType) => {
    const styles: Record<ToastType, string> = {
      success:
        "bg-green-500 text-white",
      error: "bg-red-500 text-white",
      info: "bg-blue-500 text-white",
      warning: "bg-amber-500 text-white",
    };
    return styles[type];
  };

  return (
    <div className="fixed right-4 top-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getToastStyles(toast.type)} rounded-lg px-4 py-3 shadow-lg animate-in fade-in slide-in-from-right-4 duration-200`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-4 inline-flex flex-shrink-0 text-white hover:opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
