# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # TypeScript check + Vite production build
npm run test             # Run all Vitest tests once
npm run test:watch       # Run Vitest in watch mode
npm run lint             # ESLint
npm run test:coverage    # Tests with coverage report
```

Run a single test file: `npx vitest run src/lib/__tests__/jsonExport.test.ts`

Build is `tsc -b && vite build`. TypeScript errors will fail the build. The app deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main` with base path `/AlberoGenelaogico/`.

## Architecture

**Frontend-only SPA** — React 19 + TypeScript + Vite 7, no backend. All data persists in `localStorage`.

### State Management

Three Zustand stores, no React Context:

- **`treeStore`** (with Immer middleware): persons, relationships, meta, layout. Has undo/redo via JSON-serialized history stack (max 50). Every mutation calls `pushHistory()` before modifying state.
- **`uiStore`**: selection, detail panel, search, add-person mode, confirm dialog, minimap toggle. Plain Zustand (no Immer).
- **`settingsStore`**: theme + locale. Persisted separately in `localStorage` key `familytree-settings`.

**Critical Zustand pattern**: Never create new objects/arrays in selectors. This causes infinite re-renders because Zustand uses `Object.is` for equality. Always select primitive values or stable references:
```typescript
// WRONG — creates new object every render → infinite loop
const meta = useTreeStore((s) => ({ name: s.meta.name, type: s.meta.projectType }));

// CORRECT — select primitives
const projectType = useTreeStore((s) => s.meta.projectType);
```

### Data Flow

```
User Action → Zustand Store (Immer) → React re-render → React Flow canvas
                    ↓
         Undo/Redo History Stack
                    ↓
         Auto-save to localStorage (500ms debounce)
```

Auto-save (`useAutoSave` hook) uses `useSyncExternalStore` for save status. localStorage key: `familytree-project`.

### Canvas Rendering

Uses **React Flow** (`@xyflow/react` v12) with:
- Custom `PersonNode` component (registered as `nodeTypes.person`)
- Custom `RelationshipEdge` component (registered as `edgeTypes.relationship`)
- **Dagre** (`@dagrejs/dagre`) for automatic layout computation
- Local node state managed in `FamilyTreeCanvas` via `useState` + `applyNodeChanges`, synced back to store on drag end

### Two Project Types

- **`familyTree`**: hierarchical layout (dagre uses only parent-child edges), partner nodes placed laterally
- **`friendCluster`**: uses ALL edges for dagre layout, LR orientation, 11 friend relationship subtypes with distinct edge colors

### TypeScript Configuration

`tsconfig.app.json` has `verbatimModuleSyntax: true` and `erasableSyntaxOnly: true`. This means:
- Use `import type { ... }` for type-only imports (not `import { type ... }`)
- No `enum` declarations — use `as const` objects instead (already the pattern throughout)

Path alias: `@/*` maps to `src/*`.

### Domain Types (`src/types/domain.ts`)

All types use `as const` objects + derived type aliases:
- `GENDERS`, `RELATION_TYPES`, `PARTNER_SUBTYPES`, `PARENT_CHILD_SUBTYPES`, `FRIEND_SUBTYPES`, `PROJECT_TYPES`
- `Person` has `photo: string | null` (base64 data URI)
- `Relationship` has `subtype` (union of all subtype types), `location: string | null`
- `HandlePosition`: `{ side: "top"|"bottom"|"left"|"right", offset: number }` — user-customizable edge connection points on nodes

### Import/Export

- **JSON**: Zod v4 validation schema in `src/lib/jsonExport.ts`. Uses `z.union` with literals (not `z.enum`). Import via `ProjectSchema.parse()`.
- **GEDCOM**: Custom parser/serializer in `src/lib/gedcom.ts`. Friend relationships are ignored in GEDCOM export (not part of the standard).
- **PDF/PNG/SVG**: Uses `html-to-image` to capture the `.react-flow` DOM element, then `jsPDF` for PDF.

### i18n

`react-i18next` with two languages: Italian (`it.json`, default/fallback) and English (`en.json`). Configured in `src/i18n/config.ts`. Locale stored in `settingsStore`.

### Component Structure

- `Shell` is the root layout (Header + Canvas + Panels + Modals)
- `FamilyTreeCanvas` wraps `ReactFlow` inside a `ReactFlowProvider` (provided by `Shell`)
- `PersonNode` hover buttons: G (parent), F (child), P (partner), i (info) for familyTree; A (friend), i (info) for friendCluster
- `DetailPanel` slides in from the right with tabs: Info, Relationships, Notes
- Modals are rendered at `Shell` level: `AddPersonDialog`, `ImportExportDialog`, `ConfirmDialog`, `OnboardingDialog`

### Adding New Relationship Subtypes

1. Add to the const object in `src/types/domain.ts`
2. Add Zod literal in `src/lib/jsonExport.ts` RelationshipSchema
3. Add i18n keys in both `it.json` and `en.json`
4. Add label mapping in `PersonRelationshipsTab.tsx` `getSubtypeLabel()`
5. If friend type: add edge color in `RelationshipEdge.tsx`

### Backward Compatibility

When adding new fields to domain types, ensure:
- `useAutoSave.ts` defaults the field when loading old localStorage data
- `jsonExport.ts` Zod schema uses `.optional().default(...)` for the field
- `treeStore.ts` `loadProject()` defaults the field
