# Task: Implement Full FamilyTree App (Phases 0-7)

## Context
Build a complete family tree web app from the spec in familytree-specs.md. Frontend-only, React 19 + TypeScript + Vite, with React Flow canvas, Zustand state, dark mode, i18n, import/export, search, onboarding.

## Implementation — Completed

### Phase 0 — Setup
- [x] Vite + React 19 + TypeScript project initialized
- [x] All dependencies installed (React Flow, Zustand, Immer, Framer Motion, Tailwind CSS 4, i18next, dagre, html-to-image, jsPDF, Fuse.js, Zod, React Hook Form)
- [x] Tailwind CSS 4 configured with @tailwindcss/vite plugin
- [x] Folder structure created (app, components, hooks, stores, types, utils, lib, i18n, assets)
- [x] Vitest configured for unit testing
- [x] Base UI components (Button, Input, Card, Toggle, Dialog, Tabs, Select)

### Phase 1 — Core Canvas & Data Model
- [x] TypeScript types (Person, Relationship, Project, Gender, etc.)
- [x] Zustand stores (treeStore with undo/redo, uiStore, settingsStore)
- [x] PersonNode component (avatar, name, dates, gender border, hover actions)
- [x] RelationshipEdge component (solid/dashed/double styles)
- [x] FamilyTreeCanvas with React Flow (pan, zoom, minimap)
- [x] Auto-layout with dagre
- [x] Add person flow (+parent, +child, +partner)
- [x] Delete person with confirmation
- [x] Canvas toolbar (zoom, fit, undo/redo, layout, orientation)
- [x] Auto-save to localStorage (500ms debounce)

### Phase 2 — Detail Panel & Editing
- [x] Detail panel slide-in (Framer Motion)
- [x] Tabs: Info | Relationships | Notes
- [x] Person form with Zod validation
- [x] Photo upload with resize to base64
- [x] Initials avatar with deterministic colors
- [x] Custom fields (dynamic key-value)
- [x] Relationship management in panel

### Phase 3 — Import / Export
- [x] JSON export/import with Zod validation
- [x] PDF export (html-to-image + jsPDF)
- [x] PNG/SVG export
- [x] GEDCOM import parser (.ged → persons + relationships)
- [x] GEDCOM export serializer

### Phase 4 — Dark Mode & UI Polish
- [x] Dark mode with Tailwind dark: variant
- [x] Theme toggle in header
- [x] prefers-color-scheme detection
- [x] Theme persisted to localStorage
- [x] Framer Motion animations
- [x] Empty state with CTA
- [x] Save indicator in header

### Phase 5 — Search, Navigation & Onboarding
- [x] Fuse.js fuzzy search
- [x] Search bar in header
- [x] Multiple projects support
- [x] Onboarding dialog (3 steps)
- [x] Demo project loadable

### Phase 6 — Accessibility & Responsive
- [x] ARIA labels on all interactive elements
- [x] Keyboard navigation (Tab, Enter, Escape)
- [x] Focus trap in dialogs
- [x] prefers-reduced-motion support
- [x] Responsive layout (mobile list view, tablet adaptations)
- [x] Touch-friendly targets

### Phase 7 — i18n & Finalization
- [x] i18next with IT and EN translations
- [x] Language selector in header
- [x] Before-unload warning
- [x] Unit tests (55 tests, all passing)

## Review

### Files Created (50 source files)
**Types**: domain.ts
**Stores**: treeStore.ts, uiStore.ts, settingsStore.ts
**Utils**: date.ts, avatar.ts, id.ts
**Libs**: layoutEngine.ts, jsonExport.ts, gedcom.ts, exportPdf.ts, exportImage.ts, demoData.ts
**Hooks**: useAutoSave.ts, useKeyboardShortcuts.ts
**i18n**: config.ts, it.json, en.json
**UI Components**: Button, Input, Card, Toggle, Dialog, Tabs, Select
**Canvas**: PersonNode, RelationshipEdge, CanvasToolbar, FamilyTreeCanvas, EmptyState
**Panels**: DetailPanel, PersonInfoTab, PersonNotesTab, PersonRelationshipsTab
**Modals**: ConfirmDialog, AddPersonDialog, ImportExportDialog, OnboardingDialog
**Layout**: Header, Shell, MobileListView
**App**: App.tsx, main.tsx, index.css

### Tests (6 test files, 55 tests)
- treeStore.test.ts (15 tests): CRUD operations, undo/redo, project load/clear
- gedcom.test.ts (8 tests): parse, serialize, round-trip
- layoutEngine.test.ts (4 tests): positions, empty input, orientation
- jsonExport.test.ts (6 tests): export, import, validation
- date.test.ts (13 tests): formatting, partial dates, ranges
- avatar.test.ts (9 tests): initials, colors

### Verification
- [x] TypeScript: 0 errors (strict mode)
- [x] Vitest: 55/55 tests passing
- [x] Build: Production build succeeds
- [x] UI Review: Accessibility, dark mode, responsive — all verified and fixed

### Agents Used
- **code-writer**: Wrote all 44 source files (types, stores, utils, libs, hooks, i18n, components)
- **tester**: Wrote 6 test files with 55 tests, all passing
- **ui-reviewer**: Reviewed and fixed accessibility, dark mode, responsive issues
