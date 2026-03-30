"use client";

import React, { useState } from "react";
import { Modal, ModalFooter } from "./modal";

interface BusinessDefinitionPhaseProps {
  projectName: string;
  targetUsers: string;
  coreProblem: string;
  revenueModel: string;
  isLoading: boolean;
  onSave: (data: {
    targetUsers: string;
    coreProblem: string;
    revenueModel: string;
  }) => Promise<void>;
}

export function BusinessDefinitionPhase({
  projectName,
  targetUsers: initialTargetUsers,
  coreProblem: initialCoreProblem,
  revenueModel: initialRevenueModel,
  isLoading,
  onSave,
}: BusinessDefinitionPhaseProps) {
  const [targetUsers, setTargetUsers] = useState(initialTargetUsers || "");
  const [coreProblem, setCoreProblem] = useState(initialCoreProblem || "");
  const [revenueModel, setRevenueModel] = useState(initialRevenueModel || "");
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const isComplete = !!(
    targetUsers.trim() &&
    coreProblem.trim() &&
    revenueModel.trim()
  );

  const handleSave = async () => {
    if (!isComplete) return;
    setIsSaving(true);
    try {
      await onSave({ targetUsers, coreProblem, revenueModel });
      setSuccessMsg("Business definition saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
              Business Definition
            </h1>
            <p className="text-[var(--text-secondary)] max-w-2xl">
              Define the business context for <strong>{projectName}</strong> before
              building anything. This ensures everyone understands the "why" before
              we design the "how".
            </p>
          </div>

          {/* Form */}
          <div className="space-y-8">
            {/* Target Users */}
            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--line)]">
              <label className="block mb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
                  Who are the target users? 👥
                </span>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  Describe the primary users/customers this system serves
                </p>
              </label>
              <textarea
                value={targetUsers}
                onChange={(e) => setTargetUsers(e.target.value)}
                placeholder="e.g., 'Merchants selling digital goods, students learning programming, app reviewers...'"
                rows={4}
                disabled={isLoading || isSaving}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]"
              />
            </div>

            {/* Core Problem */}
            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--line)]">
              <label className="block mb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
                  What problem are we solving? 🎯
                </span>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  What pain point or challenge does this system address?
                </p>
              </label>
              <textarea
                value={coreProblem}
                onChange={(e) => setCoreProblem(e.target.value)}
                placeholder="e.g., 'Developers struggle to find quality, unbiased reviews for libraries and tools they use'"
                rows={4}
                disabled={isLoading || isSaving}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]"
              />
            </div>

            {/* Revenue Model */}
            <div className="bg-[var(--bg-card)] rounded-lg p-6 border border-[var(--line)]">
              <label className="block mb-4">
                <span className="text-sm font-semibold text-[var(--text-primary)] mb-2 block">
                  What's the revenue model? 💰
                </span>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  How will this system generate value or revenue?
                </p>
              </label>
              <textarea
                value={revenueModel}
                onChange={(e) => setRevenueModel(e.target.value)}
                placeholder="e.g., 'Freemium: Free basic reviews, Premium: In-depth analysis and team workspace'"
                rows={4}
                disabled={isLoading || isSaving}
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-2)]"
              />
            </div>

            {/* Success Message */}
            {successMsg && (
              <div className="bg-green-500 bg-opacity-10 text-green-500 px-4 py-3 rounded-lg text-sm">
                ✓ {successMsg}
              </div>
            )}

            {/* Completion Indicator */}
            {isComplete && (
              <div className="bg-[var(--accent-2)] bg-opacity-10 border border-[var(--accent-2)] rounded-lg p-4">
                <p className="text-sm text-[var(--accent-2)] font-medium">
                  ✓ Business definition is complete. You can now proceed to the next phase!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer with Save Button */}
      <div className="border-t border-[var(--line)] bg-[var(--bg-card)] px-8 py-4 flex justify-end gap-3">
        <button
          onClick={handleSave}
          disabled={!isComplete || isLoading || isSaving}
          className="px-6 py-2 bg-[var(--accent-2)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {isSaving ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
