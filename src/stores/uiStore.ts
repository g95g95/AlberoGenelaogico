import { create } from "zustand";
import type { RelationType } from "@/types/domain";

interface AddPersonMode {
  personId: string;
  type: RelationType;
  direction: "parent" | "child" | "partner" | "friend";
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
}

interface LinkMode {
  fromPersonId: string;
}

interface UiState {
  selectedPersonId: string | null;
  detailPanelOpen: boolean;
  searchQuery: string;
  searchResults: string[];
  addPersonMode: AddPersonMode | null;
  standaloneAddPosition: { x: number; y: number } | null;
  linkMode: LinkMode | null;
  confirmDialog: ConfirmDialogState;
  minimapVisible: boolean;
}

interface UiActions {
  selectPerson: (id: string | null) => void;
  openDetailPanel: (personId: string) => void;
  closeDetailPanel: () => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (ids: string[]) => void;
  setAddPersonMode: (mode: AddPersonMode | null) => void;
  setStandaloneAddPosition: (pos: { x: number; y: number } | null) => void;
  setLinkMode: (mode: LinkMode | null) => void;
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm: () => void
  ) => void;
  hideConfirmDialog: () => void;
  toggleMinimap: () => void;
}

export const useUiStore = create<UiState & UiActions>()((set) => ({
  selectedPersonId: null,
  detailPanelOpen: false,
  searchQuery: "",
  searchResults: [],
  addPersonMode: null,
  standaloneAddPosition: null,
  linkMode: null,
  confirmDialog: { open: false, title: "", message: "", onConfirm: null },
  minimapVisible: true,

  selectPerson: (id) => set({ selectedPersonId: id }),

  openDetailPanel: (personId) =>
    set({ selectedPersonId: personId, detailPanelOpen: true }),

  closeDetailPanel: () => set({ detailPanelOpen: false }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setSearchResults: (ids) => set({ searchResults: ids }),

  setAddPersonMode: (mode) => set({ addPersonMode: mode }),

  setStandaloneAddPosition: (pos) => set({ standaloneAddPosition: pos }),

  setLinkMode: (mode) => set({ linkMode: mode }),

  showConfirmDialog: (title, message, onConfirm) =>
    set({ confirmDialog: { open: true, title, message, onConfirm } }),

  hideConfirmDialog: () =>
    set({
      confirmDialog: { open: false, title: "", message: "", onConfirm: null },
    }),

  toggleMinimap: () =>
    set((state) => ({ minimapVisible: !state.minimapVisible })),
}));
