import { useEffect, useRef, useState } from "react";
import { useTreeStore } from "@/stores/treeStore";

const STORAGE_KEY = "familytree-project";
const DEBOUNCE_MS = 500;

export function useAutoSave() {
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        useTreeStore.getState().loadProject(data);
      }
    } catch {
      // ignore corrupt data
    }
  }, []);

  useEffect(() => {
    const unsub = useTreeStore.subscribe((state) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setSaveStatus("saving");

      timeoutRef.current = setTimeout(() => {
        const { persons, relationships, meta, layout } = state;
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

  return saveStatus;
}
