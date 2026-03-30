"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Modal } from "./modal";

type Capability = { id: string; name: string; actorIds?: string[]; description: string };
type Actor = { id: string; name: string; description: string };

export function CapabilitiesModal({
  isOpen,
  onClose,
  capabilities,
  actors,
  onAdd,
  onDelete,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  capabilities: Capability[];
  actors: Actor[];
  onAdd: (capability: Omit<Capability, "id">) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}): ReactNode {
  const [form, setForm] = useState<Omit<Capability, "id">>({
    name: "",
    actorIds: [],
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd(form);
      setForm({ name: "", actorIds: [], description: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Capabilities" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Capability name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          autoFocus
          disabled={isSubmitting}
        />
        <select
          multiple
          value={form.actorIds || []}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map(
              (o) => o.value
            );
            setForm((s) => ({ ...s, actorIds: selected }));
          }}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          disabled={isSubmitting}
        >
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) =>
            setForm((s) => ({ ...s, description: e.target.value }))
          }
          rows={2}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !form.name.trim()}
          className="w-full rounded-lg bg-[var(--accent-2)] px-4 py-2 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Adding..." : "Add Capability"}
        </button>
      </form>

      <div className="space-y-2 pt-4 border-t border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--ink-muted)]">
          {capabilities.length} Capabilit{capabilities.length !== 1 ? "ies" : "y"}
        </p>
        {capabilities.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No capabilities yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {capabilities.map((cap) => (
              <div
                key={cap.id}
                className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--bg)]"
              >
                <div>
                  <p className="font-medium text-sm">{cap.name}</p>
                  {cap.actorIds && cap.actorIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {cap.actorIds.map((actorId) => (
                        <span
                          key={actorId}
                          className="text-xs bg-[var(--accent-2)] bg-opacity-20 text-[var(--accent-2)] px-2 py-1 rounded"
                        >
                          {actors.find((a) => a.id === actorId)?.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {cap.description && (
                    <p className="text-xs text-[var(--ink-muted)] mt-1">
                      {cap.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(cap.id)}
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
