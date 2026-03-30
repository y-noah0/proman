"use client";

import React from "react";

export function ProgressBar({ progress }: { progress: number }) {
  const safeProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="fixed bottom-5 left-4 right-4 z-40 md:left-[calc(14rem+1rem)] md:right-6">
      <div className="rounded-xl border border-[var(--line)] bg-[var(--bg-card)]/95 px-6 py-4 shadow-xl backdrop-blur">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            Workflow Progress
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            {safeProgress}%
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--line)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent-2)] to-[var(--accent-1)] transition-all duration-500"
            style={{ width: `${safeProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
