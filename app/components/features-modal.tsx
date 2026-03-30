"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Modal } from "./modal";
import { getPriorityColor, getStatusColor } from "@/lib/ui-utils";

type Feature = {
  id: string;
  featureName: string;
  actorId?: string;
  capabilityId?: string;
  priority: "Must" | "Should" | "Could" | "Won't";
  status: "Not Started" | "In Progress" | "Done" | "Review" | "Accepted" | "Needs Revision";
  validatedFeature?: boolean;
  apiContractId?: string;
  description: string;
  acceptanceCriteria: string;
  timeline?: string;
};

type Actor = { id: string; name: string; description: string };
type Capability = { id: string; name: string; actorIds?: string[]; description: string };

export function FeaturesModal({
  isOpen,
  onClose,
  features,
  actors,
  capabilities,
  onAdd,
  onDelete,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  features: Feature[];
  actors: Actor[];
  capabilities: Capability[];
  onAdd: (feature: Omit<Feature, "id">) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}): ReactNode {
  const [form, setForm] = useState<Omit<Feature, "id">>({
    featureName: "",
    actorId: "",
    capabilityId: "",
    priority: "Should",
    status: "Not Started",
    validatedFeature: false,
    description: "",
    acceptanceCriteria: "",
    timeline: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.featureName.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd(form);
      setForm({
        featureName: "",
        actorId: "",
        capabilityId: "",
        priority: "Should",
        status: "Not Started",
        validatedFeature: false,
        description: "",
        acceptanceCriteria: "",
        timeline: "",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Features" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Feature name"
          value={form.featureName}
          onChange={(e) =>
            setForm((s) => ({ ...s, featureName: e.target.value }))
          }
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          autoFocus
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.actorId}
            onChange={(e) => setForm((s) => ({ ...s, actorId: e.target.value }))}
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
            disabled={isSubmitting}
          >
            <option value="">Actor (optional)</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>

          <select
            value={form.priority}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                priority: e.target.value as Feature["priority"],
              }))
            }
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
            disabled={isSubmitting}
          >
            <option value="Must">Must</option>
            <option value="Should">Should</option>
            <option value="Could">Could</option>
            <option value="Won't">Won't</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.capabilityId}
            onChange={(e) =>
              setForm((s) => ({ ...s, capabilityId: e.target.value }))
            }
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
            disabled={isSubmitting}
          >
            <option value="">Capability (optional)</option>
            {capabilities.map((cap) => (
              <option key={cap.id} value={cap.id}>
                {cap.name}
              </option>
            ))}
          </select>

          <select
            value={form.status}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                status: e.target.value as Feature["status"],
              }))
            }
            className="rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
            disabled={isSubmitting}
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
            <option value="Review">Review</option>
            <option value="Accepted">Accepted</option>
            <option value="Needs Revision">Needs Revision</option>
          </select>
        </div>

        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) =>
            setForm((s) => ({ ...s, description: e.target.value }))
          }
          rows={2}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          disabled={isSubmitting}
        />

        <textarea
          placeholder="Acceptance Criteria"
          value={form.acceptanceCriteria}
          onChange={(e) =>
            setForm((s) => ({ ...s, acceptanceCriteria: e.target.value }))
          }
          rows={2}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          disabled={isSubmitting}
        />

        <div className="flex gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.validatedFeature || false}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  validatedFeature: e.target.checked,
                }))
              }
              disabled={isSubmitting}
            />
            <span className="text-sm">This feature has been validated</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !form.featureName.trim()}
          className="w-full rounded-lg bg-[var(--accent-2)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Feature"}
        </button>
      </form>

      <div className="space-y-2 pt-4 border-t border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--ink-muted)]">
          {features.length} Feature{features.length !== 1 ? "s" : ""}
        </p>
        {features.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No features yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {features.map((feature) => (
              <div
                key={feature.id}
                className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--bg)]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{feature.featureName}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span
                      className={`text-xs px-2 py-1 rounded ${getStatusColor(feature.status)}`}
                    >
                      {feature.status}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${getPriorityColor(feature.priority)}`}
                    >
                      {feature.priority}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(feature.id)}
                  disabled={isLoading}
                  className="flex-shrink-0 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500 hover:bg-opacity-10 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
