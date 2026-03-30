"use client";

import { FormEvent, ReactNode, useState } from "react";
import { Modal, ModalFooter } from "./modal";

type Actor = { id: string; name: string; description: string };

export function ActorsModal({
  isOpen,
  onClose,
  actors,
  onAdd,
  onDelete,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  actors: Actor[];
  onAdd: (actor: Omit<Actor, "id">) => Promise<unknown>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}): ReactNode {
  const [form, setForm] = useState<Omit<Actor, "id">>({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    try {
      await onAdd(form);
      setForm({ name: "", description: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Actors" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Actor name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          autoFocus
          disabled={isSubmitting}
        />
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
          {isSubmitting ? "Adding..." : "Add Actor"}
        </button>
      </form>

      <div className="space-y-2 pt-4 border-t border-[var(--line)]">
        <p className="text-sm font-semibold text-[var(--ink-muted)]">
          {actors.length} Actor{actors.length !== 1 ? "s" : ""}
        </p>
        {actors.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)]">No actors yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {actors.map((actor) => (
              <div
                key={actor.id}
                className="group flex items-start gap-3 rounded-lg p-2 hover:bg-[var(--bg)]"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{actor.name}</p>
                  {actor.description && (
                    <p className="text-xs text-[var(--ink-muted)]">
                      {actor.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDelete(actor.id)}
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
