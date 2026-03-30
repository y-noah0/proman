"use client";

import { useCallback, useState } from "react";
import { showToast } from "./toast";

interface OptimisticState<T> {
  data: T;
  isOptimistic: boolean;
}

export function useOptimisticUpdate<T>(
  initialData: T,
  onSave: (data: T) => Promise<void>,
) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isOptimistic: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOptimistic = useCallback(
    (updater: (current: T) => T) => {
      const newData = updater(state.data);
      setState({
        data: newData,
        isOptimistic: true,
      });

      // Save in background
      setIsSaving(true);
      setError(null);

      onSave(newData)
        .then(() => {
          setState((current) => ({
            ...current,
            isOptimistic: false,
          }));
          setIsSaving(false);
        })
        .catch((err) => {
          console.error("Save failed:", err);
          setError("Failed to save changes");
          setState({
            data: initialData,
            isOptimistic: false,
          });
          setIsSaving(false);
          showToast("Failed to save changes", "error");
        });
    },
    [state.data, initialData, onSave],
  );

  return {
    data: state.data,
    isOptimistic: state.isOptimistic,
    isSaving,
    error,
    updateOptimistic,
    setData: (data: T) =>
      setState({
        data,
        isOptimistic: false,
      }),
  };
}

export function useOptimisticList<T extends { id: string }>(
  initialItems: T[],
  createItem: (item: Omit<T, "id">) => Promise<T>,
  updateItem: (id: string, item: Partial<T>) => Promise<T>,
  deleteItem: (id: string) => Promise<void>,
) {
  const [items, setItems] = useState(initialItems);
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const create = useCallback(
    async (item: Omit<T, "id">) => {
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = { ...item, id: tempId } as T;

      setItems((current) => [optimisticItem, ...current]);
      setOptimisticIds((current) => new Set([...current, tempId]));
      setIsSaving(true);

      try {
        const created = await createItem(item);
        setItems((current) =>
          current.map((i) => (i.id === tempId ? created : i)),
        );
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(tempId);
          return next;
        });
        showToast("Item created", "success");
        return created;
      } catch (err) {
        console.error(err);
        setItems((current) => current.filter((i) => i.id !== tempId));
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(tempId);
          return next;
        });
        showToast("Failed to create item", "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [createItem],
  );

  const update = useCallback(
    async (id: string, item: Partial<T>) => {
      const original = items.find((i) => i.id === id);
      if (!original) throw new Error("Item not found");

      const updated = { ...original, ...item };
      setItems((current) => current.map((i) => (i.id === id ? updated : i)));
      setOptimisticIds((current) => new Set([...current, id]));
      setIsSaving(true);

      try {
        const result = await updateItem(id, item);
        setItems((current) => current.map((i) => (i.id === id ? result : i)));
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        showToast("Item updated", "success");
        return result;
      } catch (err) {
        console.error(err);
        setItems((current) =>
          current.map((i) => (i.id === id ? original : i)),
        );
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        showToast("Failed to update item", "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [items, updateItem],
  );

  const delete_ = useCallback(
    async (id: string) => {
      const original = items.find((i) => i.id === id);
      setItems((current) => current.filter((i) => i.id !== id));
      setOptimisticIds((current) => new Set([...current, id]));
      setIsSaving(true);

      try {
        await deleteItem(id);
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        showToast("Item deleted", "success");
      } catch (err) {
        console.error(err);
        if (original) {
          setItems((current) => [original, ...current]);
        }
        setOptimisticIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        showToast("Failed to delete item", "error");
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [items, deleteItem],
  );

  return {
    items,
    optimisticIds,
    isSaving,
    create,
    update,
    delete: delete_,
    setItems,
  };
}
