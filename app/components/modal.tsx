"use client";

import { ReactNode } from "react";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}): ReactNode {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div
        className={`card max-h-screen overflow-y-auto w-full ${sizeClasses[size]} p-6 space-y-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-2xl leading-none text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({
  onCancel,
  onSubmit,
  cancelText = "Cancel",
  submitText = "Save",
  isLoading = false,
}: {
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  cancelText?: string;
  submitText?: string;
  isLoading?: boolean;
}): ReactNode {
  return (
    <div className="flex gap-3 pt-4 border-t border-[var(--line)]">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 rounded-lg border border-[var(--line)] px-4 py-2 font-medium hover:bg-[var(--bg-card)] disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="flex-1 rounded-lg bg-[var(--accent-2)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? `${submitText}...` : submitText}
      </button>
    </div>
  );
}
