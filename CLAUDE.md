# Gantt Chart Project

Interactive Gantt chart application for project planning and task management.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.9 + Vite 7
- **State Management**: Zustand 5 (immer middleware + zundo undo/redo)
- **UI**: shadcn/ui + Radix primitives + Tailwind CSS 4
- **Icons**: lucide-react
- **IDs**: nanoid
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 + typescript-eslint
- **Packaging**: @yao-pkg/pkg (standalone Windows EXE)

## Commands

```bash
pnpm dev          # Start dev server
pnpm build        # Production build (tsc + vite)
pnpm build:exe    # Build + package as standalone Windows EXE
pnpm test         # Run tests
pnpm test:watch   # Watch mode
pnpm lint         # ESLint
pnpm preview      # Preview production build
```

---

## Architecture

### Store (Zustand)

Sliced architecture with middleware stack: `temporal(immer(...))`.

**`src/stores/index.ts`** — Composes 3 slices into `StoreState`:
- `ChartSlice` — chart data (rows, activities, dependencies)
- `UiSlice` — UI state (zoom, selection, editing, dependency mode)
- `PersistenceSlice` — save/load/export/import

Undo/redo via zundo `temporal` middleware, partializes only `chart` state (50 history limit).

**`src/stores/hooks.ts`** — `useTemporalStore()`, `useUndo()`, `useRedo()`.

### Key Data Model (`src/types/gantt.ts`)

- **`Activity.startMonth`** — offset from chart start (month index 0-based). When chart start date changes, all activities are shifted to preserve calendar position.
- **`Activity.isMilestone`** — renders as diamond instead of bar
- **`Activity.rowSpan`** — 1 (default) or 2 rows
- **`GanttRow.mergedWithNext`** — visual cell merge in sidebar
- **`Dependency`** — connects two activities via `fromSide`/`toSide` anchors (left/right/top/bottom)
- **`GanttChart`** — root object with date range, rows, activities, dependencies

### Component Hierarchy

```
App
├── Toolbar (chart name, date range, zoom, connect mode, undo/redo, file ops, help)
└── GanttChart
    ├── Sidebar (row names, merge groups, resize handle)
    ├── TimelineHeader (year / quarter / month tiers)
    ├── TimelineGrid (background lines)
    ├── TodayMarker (red dashed line)
    ├── TimelineBody
    │   ├── ActivityBar (drag, resize, rowSpan, context menu, color, inline rename)
    │   └── MilestoneMarker (diamond, drag, context menu)
    └── DependencyLayer (SVG orthogonal arrows)
```

### Drag Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useDragCreate` | Drag on empty timeline to create activity (double-click = 1-month) |
| `useDragMove` | Drag activity bar horizontally (snaps to month grid) |
| `useDragResize` | Drag left/right edge to resize duration |
| `useDragRowSpan` | Drag bottom edge to span 2 rows |
| `useDragConnect` | Drag from anchor dot to create dependency |
| `useResizeSidebar` | Drag sidebar right edge to resize |

### Other Hooks

| Hook | Purpose |
|------|---------|
| `useKeyboardShortcuts` | Ctrl+Z, Ctrl+Shift+Z, Delete, Escape |
| `useAutoSave` | Debounced auto-save to localStorage |

---

## Project Structure

```
src/
├── components/
│   ├── Activity/           # ActivityBar, MilestoneMarker, ColorPicker
│   ├── DependencyArrows/   # DependencyLayer (SVG)
│   ├── Dialogs/            # AddRowDialog, SaveDialog, HelpDialog, DisciplineDialog
│   ├── GanttChart/         # GanttChart (main container)
│   ├── Sidebar/            # Sidebar (row names)
│   ├── Timeline/           # TimelineBody, TimelineHeader, TimelineGrid, TodayMarker
│   ├── Toolbar/            # Toolbar (top bar)
│   └── ui/                 # shadcn/ui: button, context-menu, dialog, input, tooltip
├── constants/
│   ├── timeline.ts         # ROW_HEIGHT=40, HEADER_HEIGHT=84, zoom limits, month names
│   └── colors.ts           # 11 color families x 4 shades, DEFAULT_ACTIVITY_COLOR
├── hooks/                  # Drag hooks, keyboard shortcuts, auto-save, sidebar resize
├── lib/
│   └── utils.ts            # cn() — clsx + tailwind-merge
├── stores/
│   ├── index.ts            # Store composition (immer + temporal)
│   ├── hooks.ts            # useUndo, useRedo
│   └── slices/
│       ├── chartSlice.ts   # Rows, activities, dependencies CRUD
│       ├── uiSlice.ts      # Zoom, selection, editing, dependency mode
│       └── persistenceSlice.ts  # Save/load/export/import
├── types/
│   └── gantt.ts            # Activity, GanttRow, GanttChart, Dependency, AnchorSide
├── utils/
│   ├── timeline.ts         # Month/year/quarter header builders, getCurrentMonthIndex
│   ├── dependencyRouting.ts # Orthogonal arrow routing, anchor points, SVG path gen
│   └── persistence.ts      # localStorage CRUD, JSON export/import, chart migration
├── App.tsx                 # Root component
├── main.tsx                # React entry point
└── index.css               # Tailwind imports, custom theme, anchor dot styles

launcher/
└── server.cjs              # Standalone HTTP server for EXE distribution
```

---

## Key Constants (`src/constants/timeline.ts`)

| Constant | Value | Usage |
|----------|-------|-------|
| `ROW_HEIGHT` | 40px | Row height in timeline |
| `HEADER_HEIGHT` | 84px | 3 tiers x 28px |
| `DEFAULT_MONTH_WIDTH` | 80px | Initial zoom level |
| `MIN_MONTH_WIDTH` | 20px | Min zoom |
| `MAX_MONTH_WIDTH` | 180px | Max zoom |
| `ZOOM_STEP` | 10px | Zoom increment |
| `DEFAULT_SIDEBAR_WIDTH` | 240px | Initial sidebar width |

---

## Features

1. **Rows** — Add, rename, delete, reorder, merge name cells
2. **Activities** — Create by drag/double-click, move, resize, row-span, color, inline rename
3. **Milestones** — Diamond markers, convert to/from activity via context menu
4. **Dependencies** — Toggle connect mode, drag anchor-to-anchor, orthogonal SVG arrows
5. **Timeline** — Year/quarter/month headers, zoom, today marker, date range picker
6. **Undo/Redo** — 50-step history (Ctrl+Z / Ctrl+Shift+Z)
7. **Persistence** — Auto-save, manual save, load, export/import JSON
8. **Keyboard** — Ctrl+Z, Ctrl+Y, Delete, Escape, Enter

---

## Portable EXE Distribution

`pnpm build:exe` produces a single `dist-exe/GanttChart.exe` (~65MB) that bundles:
- Node.js runtime (via `@yao-pkg/pkg`)
- Built web app (embedded in the EXE)
- Minimal HTTP server (`launcher/server.cjs`)

Double-click the EXE to launch — it starts a local server and opens the app in the default browser. No Node.js or other dependencies needed on the target PC.

**Note:** The EXE is unsigned. Windows SmartScreen will prompt "More info" → "Run anyway" on first launch.

---

## Patterns & Conventions

- **Activities identified by** `data-activity-bar` attribute
- **Timeline body container**: use `[data-timeline-body]` selector
- **Anchor dots**: CSS classes in index.css, positioned via `data-side` attribute
- **Selection mutual exclusion**: `selectedActivity` and `selectedDependency` clear each other
- **Persistence migration**: `migrateChart()` converts old discipline format to flat rows
- **No routing library** — single-page app, dialogs are modals

---

## TypeScript Best Practices

- `strict: true` + `noUncheckedIndexedAccess: true`
- Prefer `type` over `interface`
- Use `as const` + union types instead of `enum`
- Prefer `unknown` over `any`
- Named exports only (no default exports)
- Co-locate component prop types in same file

## React Best Practices

- Functional components only
- One component per file (PascalCase)
- Extract complex logic into hooks
- Use `cn()` for conditional Tailwind classes
- Composition over configuration
- Local state for UI, Zustand for shared state

## File Naming

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `GanttChart.tsx` |
| Hooks | camelCase with `use` | `useDragMove.ts` |
| Utilities | camelCase | `dependencyRouting.ts` |
| Types | PascalCase | `Activity`, `GanttChart` |
| Constants | UPPER_SNAKE_CASE | `ROW_HEIGHT` |
| Store slices | camelCase + `Slice` | `chartSlice.ts` |
| Tests | co-located `.test.ts(x)` | `GanttChart.test.tsx` |

## Git Conventions

- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`)
- **Branches**: `feat/gantt-zoom`, `fix/task-resize-bug`

## Code Quality

1. No dead code — delete unused variables, imports, functions
2. No magic numbers — use named constants
3. No string literals for state — use union types
4. Single responsibility per function/component
5. Early returns to reduce nesting
6. Immutable state updates (immer)
