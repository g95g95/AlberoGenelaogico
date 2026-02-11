import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useTreeStore } from "@/stores/treeStore";

const STORAGE_KEY = "familytree-project";
const DEBOUNCE_MS = 500;

let _saveStatus: "saved" | "saving" | "idle" = "idle";
const listeners = new Set<() => void>();

function setSaveStatus(status: "saved" | "saving" | "idle") {
  _saveStatus = status;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return _saveStatus;
}

export function useAutoSave() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.meta && !data.meta.projectType) {
          data.meta.projectType = "familyTree";
        }
        if (data.relationships) {
          data.relationships = data.relationships.map((r: any) => ({
            ...r,
            location: r.location ?? null,
          }));
        }
        useTreeStore.getState().loadProject(data);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  useEffect(() => {
    let skipFirst = true;
    const unsub = useTreeStore.subscribe(() => {
      // Skip the first notification (from initial load)
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSaveStatus("saving");

      timeoutRef.current = setTimeout(() => {
        const { persons, relationships, meta, layout } = useTreeStore.getState();
        const data = { persons, relationships, meta, layout };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveStatus("saved");
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getSnapshotCb = useCallback(() => getSnapshot(), []);

  return useSyncExternalStore(subscribe, getSnapshotCb);
}
