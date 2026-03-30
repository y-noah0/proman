"use client";

import { ReactNode } from "react";

export function LoadingSpinner({
  label = "Loading...",
}: {
  label?: string;
}): ReactNode {
  return (
    <div className="flex items-center justify-center gap-3 py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent-2)]" />
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}): ReactNode {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="text-4xl">📭</div>
      <div>
        <h3 className="font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorAlert({
  title = "Error",
  message,
  onDismiss,
}: {
  title?: string;
  message: string;
  onDismiss?: () => void;
}): ReactNode {
  return (
    <div className="rounded-lg border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950 p-4 text-sm text-red-900 dark:text-red-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          {title && <div className="font-semibold">{title}</div>}
          <p className={title ? "mt-1" : ""}>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function SuccessAlert({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}): ReactNode {
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950 p-4 text-sm text-green-900 dark:text-green-100">
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-green-600 dark:text-green-300 hover:text-green-800 dark:hover:text-green-100"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
}): ReactNode {
  const variantClasses = {
    default: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100",
    success: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100",
    warning: "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100",
    error: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100",
    info: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}): ReactNode {
  const variantClasses = {
    primary:
      "bg-[var(--accent-2)] text-white hover:opacity-90 disabled:opacity-70",
    secondary:
      "border border-[var(--line)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg)] dark:hover:bg-[var(--bg)]",
    danger: "bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-800 disabled:opacity-70",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-opacity disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
