import { useEffect } from "react";
import { useTreeStore } from "@/stores/treeStore";
import { useUiStore } from "@/stores/uiStore";

export function useKeyboardShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        useUiStore.getState().closeDetailPanel();
        useUiStore.getState().setAddPersonMode(null);
        return;
      }

      if (isInput) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.shiftKey && e.key === "z") {
        e.preventDefault();
        useTreeStore.getState().redo();
        return;
      }
      if (ctrl && e.key === "z") {
        e.preventDefault();
        useTreeStore.getState().undo();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedId = useUiStore.getState().selectedPersonId;
        if (selectedId) {
          const person = useTreeStore
            .getState()
            .persons.find((p) => p.id === selectedId);
          if (person) {
            useUiStore
              .getState()
              .showConfirmDialog(
                "Elimina persona",
                `Eliminare ${person.firstName} ${person.lastName}?`,
                () => {
                  useTreeStore.getState().deletePerson(selectedId);
                  useUiStore.getState().selectPerson(null);
                  useUiStore.getState().closeDetailPanel();
                }
              );
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
