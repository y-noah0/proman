"use client";

import React from "react";
import { SDLCPhase, SDLC_PHASES } from "@/lib/pfds";
import { getPhaseRequirements } from "@/lib/sdlc";

interface PhaseNavigationProps {
  projectState: {
    phaseCompletion?: Record<SDLCPhase, boolean>;
  };
  currentPhase: SDLCPhase;
  onPhaseSelect: (phase: SDLCPhase) => void;
}

export function PhaseNavigation({
  projectState,
  currentPhase,
  onPhaseSelect,
}: PhaseNavigationProps) {
  const requirements = getPhaseRequirements(projectState);

  return (
    <div className="w-56 bg-[var(--bg-card)] border-r border-[var(--line)] flex flex-col h-screen">
      <div className="px-4 py-6 border-b border-[var(--line)]">
        <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          SDLC Workflow
        </h2>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {requirements.map((req, index) => {
          const isLocked = !req.canNavigate;
          const isActive = currentPhase === req.phase;
          const isComplete = req.isComplete;

          return (
            <button
              key={req.phase}
              onClick={() => !isLocked && onPhaseSelect(req.phase)}
              disabled={isLocked}
              className={`
                w-full text-left px-3 py-3 rounded-lg transition-all duration-200
                flex items-start gap-3
                ${
                  isActive
                    ? "bg-[var(--accent-2)] text-white shadow-lg"
                    : isComplete
                      ? "bg-[var(--line)] text-[var(--text-primary)] hover:bg-[var(--accent-2)] hover:bg-opacity-20"
                      : isLocked
                        ? "bg-transparent text-[var(--text-secondary)] cursor-not-allowed opacity-50"
                        : "bg-transparent text-[var(--text-primary)] hover:bg-[var(--line)]"
                }
              `}
              title={isLocked ? "Complete previous phase first" : ""}
            >
              {/* Phase number and icon */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-opacity-20"
                style={{
                  background: isComplete ? "var(--accent-2)" : isActive ? "white" : "var(--line)"
                }}
              >
                {isComplete ? (
                  <span className="text-xs font-bold">✓</span>
                ) : isLocked ? (
                  <span className="text-xs font-bold">🔒</span>
                ) : (
                  <span className="text-xs font-bold">{index + 1}</span>
                )}
              </div>

              {/* Phase name and description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{req.name}</p>
                <p className="text-xs opacity-75 line-clamp-2">
                  {req.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[var(--line)] text-xs text-[var(--text-secondary)]">
        <p>Complete each phase to unlock the next step.</p>
      </div>
    </div>
  );
}
