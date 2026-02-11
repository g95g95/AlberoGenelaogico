import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Person,
  Relationship,
  ProjectMeta,
  LayoutConfig,
} from "@/types/domain";

interface TreeState {
  persons: Person[];
  relationships: Relationship[];
  meta: ProjectMeta;
  layout: LayoutConfig;
  _pastStates: { persons: Person[]; relationships: Relationship[] }[];
  _futureStates: { persons: Person[]; relationships: Relationship[] }[];
}

interface TreeActions {
  addPerson: (person: Person) => void;
  updatePerson: (id: string, updates: Partial<Person>) => void;
  deletePerson: (id: string) => void;
  addRelationship: (rel: Relationship) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;
  loadProject: (data: {
    persons: Person[];
    relationships: Relationship[];
    meta: ProjectMeta;
    layout: LayoutConfig;
  }) => void;
  clearProject: () => void;
  setLayout: (layout: Partial<LayoutConfig>) => void;
  updateMeta: (meta: Partial<ProjectMeta>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

const MAX_HISTORY = 50;

const defaultMeta: ProjectMeta = {
  name: "Nuovo Progetto",
  description: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  author: "",
  projectType: "familyTree",
};

const defaultLayout: LayoutConfig = {
  orientation: "vertical",
  rootPersonId: null,
  nodePositions: {},
};

function pushHistory(state: TreeState) {
  state._pastStates.push({
    persons: JSON.parse(JSON.stringify(state.persons)),
    relationships: JSON.parse(JSON.stringify(state.relationships)),
  });
  if (state._pastStates.length > MAX_HISTORY) {
    state._pastStates.shift();
  }
  state._futureStates = [];
}

export const useTreeStore = create<TreeState & TreeActions>()(
  immer((set, get) => ({
    persons: [],
    relationships: [],
    meta: { ...defaultMeta },
    layout: { ...defaultLayout },
    _pastStates: [],
    _futureStates: [],

    addPerson: (person) =>
      set((state) => {
        pushHistory(state);
        state.persons.push(person);
        state.meta.updatedAt = new Date().toISOString();
      }),

    updatePerson: (id, updates) =>
      set((state) => {
        pushHistory(state);
        const idx = state.persons.findIndex((p) => p.id === id);
        if (idx !== -1) {
          Object.assign(state.persons[idx], updates);
          state.meta.updatedAt = new Date().toISOString();
        }
      }),

    deletePerson: (id) =>
      set((state) => {
        pushHistory(state);
        state.persons = state.persons.filter((p) => p.id !== id);
        state.relationships = state.relationships.filter(
          (r) => r.from !== id && r.to !== id
        );
        if (state.layout.rootPersonId === id) {
          state.layout.rootPersonId = state.persons[0]?.id ?? null;
        }
        delete state.layout.nodePositions[id];
        state.meta.updatedAt = new Date().toISOString();
      }),

    addRelationship: (rel) =>
      set((state) => {
        pushHistory(state);
        state.relationships.push(rel);
        state.meta.updatedAt = new Date().toISOString();
      }),

    updateRelationship: (id, updates) =>
      set((state) => {
        pushHistory(state);
        const idx = state.relationships.findIndex((r) => r.id === id);
        if (idx !== -1) {
          Object.assign(state.relationships[idx], updates);
          state.meta.updatedAt = new Date().toISOString();
        }
      }),

    deleteRelationship: (id) =>
      set((state) => {
        pushHistory(state);
        state.relationships = state.relationships.filter((r) => r.id !== id);
        state.meta.updatedAt = new Date().toISOString();
      }),

    loadProject: (data) =>
      set((state) => {
        state.persons = data.persons;
        state.relationships = data.relationships;
        state.meta = { ...data.meta, projectType: data.meta.projectType ?? "familyTree" };
        state.layout = data.layout;
        state._pastStates = [];
        state._futureStates = [];
      }),

    clearProject: () =>
      set((state) => {
        state.persons = [];
        state.relationships = [];
        state.meta = { ...defaultMeta, createdAt: new Date().toISOString() };
        state.layout = { ...defaultLayout };
        state._pastStates = [];
        state._futureStates = [];
      }),

    setLayout: (layout) =>
      set((state) => {
        Object.assign(state.layout, layout);
      }),

    updateMeta: (meta) =>
      set((state) => {
        Object.assign(state.meta, meta);
        state.meta.updatedAt = new Date().toISOString();
      }),

    undo: () =>
      set((state) => {
        const prev = state._pastStates.pop();
        if (!prev) return;
        state._futureStates.push({
          persons: JSON.parse(JSON.stringify(state.persons)),
          relationships: JSON.parse(JSON.stringify(state.relationships)),
        });
        state.persons = prev.persons;
        state.relationships = prev.relationships;
        state.meta.updatedAt = new Date().toISOString();
      }),

    redo: () =>
      set((state) => {
        const next = state._futureStates.pop();
        if (!next) return;
        state._pastStates.push({
          persons: JSON.parse(JSON.stringify(state.persons)),
          relationships: JSON.parse(JSON.stringify(state.relationships)),
        });
        state.persons = next.persons;
        state.relationships = next.relationships;
        state.meta.updatedAt = new Date().toISOString();
      }),

    canUndo: () => get()._pastStates.length > 0,
    canRedo: () => get()._futureStates.length > 0,
  }))
);
