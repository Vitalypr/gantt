# Architecture

How the app fits together, end to end. Read this once; after that the path-scoped rules in
`.claude/rules/` carry the per-area detail.

## What it is

A single-page React 19 + TypeScript 5.9 + Vite 7 application for *drawing* program-plan
charts. It has no backend, no router, and no scheduling engine. The user drags rectangles
onto rows and exports a picture or a JSON file.

The deliberate omission is worth stating plainly: **dependency arrows carry no semantics.**
They are anchor-to-anchor polylines. Nothing recalculates when a bar moves, there is no
critical path, and there are no typed FS/SS/FF/SF relationships. That is the product, not a
gap — see `improvement-roadmap.md` for what would be betrayed by changing it.

## Layers

```
App                       global hooks (keyboard, autosave), easter egg
├── Toolbar               ~24 controls, owns all three dialogs and the toast
└── GanttChart            LAYOUT OWNER — measures, computes rowLayout, instantiates drag hooks
    ├── Sidebar           row name cells, merge groups, resize handle
    ├── TimelineHeader    year / quarter / month  (months mode)
    │                     month / week            (weeks mode)
    ├── TimelineGrid      background SVG lines
    ├── TodayMarker       vertical line at the current unit
    ├── TimelineBody      one absolutely-positioned lane per row
    │   ├── ActivityBar      bar, hit-zone dispatch, context menu, inline rename
    │   └── MilestoneMarker  diamond, context menu, inline rename
    └── DependencyLayer   SVG arrows + drag preview
```

`GanttChart.tsx` is the hub. It owns the `ResizeObserver`, derives `effectiveUnitWidth` and
`rowLayout`, instantiates all six drag hooks, and hands their return objects wholesale down
to `TimelineBody`. Almost every geometric decision in the app traces back to that file.

## State

One Zustand store (`src/stores/index.ts`) composes three slices into a flat object inside
`temporal(immer(...))`.

| Slice | Owns |
|---|---|
| `chartSlice` | `chart` (months) and `weeksChart` (weeks); all row / activity / dependency CRUD |
| `uiSlice` | zoom, sidebar width, selection, editing, dependency mode, row size, timeline mode, font size |
| `persistenceSlice` | named saves, load, delete, export, import; the saved-chart index |

Two facts dominate everything else:

**Two charts coexist.** Switching timeline mode does not convert the chart — it switches to
a different one. Every mutator routes through `withActive(state)`, keyed on
`uiSlice.timelineMode`. `GanttChart` and `WeeksChart` are structurally identical types, so
the compiler cannot catch a misrouted chart.

**Undo tracks chart data only.** zundo `partialize`s `{chart, weeksChart}` with a
reference-equality predicate and a 50-entry cap. Every mutator bumps `updatedAt`, so every
`set()` that touches a chart is a history entry. UI state is outside history by design.

## Coordinates

Everything is `unitIndex * effectiveUnitWidth`. A unit is a month or a week depending on
mode. There are no `Date` objects in the render path — dates exist only inside
`src/utils/timeline.ts` while building headers and boundary sets.

```
containerWidth        ResizeObserver on [data-gantt-scroll]
availableWidth        containerWidth - sidebarWidth
fitWidth              availableWidth / totalUnits
effectiveUnitWidth    max(monthWidth, fitWidth)        ← auto-fit floor
timelineWidth         totalUnits * effectiveUnitWidth
rowLayout.rows[i].y   i * ROW_SIZE_MAP[rowSize]
```

`effectiveUnitWidth` is written back into the store so the drag hooks snap against the width
actually rendered. Scroll sync between sidebar, header and body is pure CSS `position:
sticky` inside one scroll container — no JS scroll listener, and no virtualisation.

## Interaction

Six hand-rolled Pointer Events hooks in `src/hooks/`:

| Hook | Gesture | Commits |
|---|---|---|
| `useDragCreate` | drag / double-tap on empty row | `addActivity` + `setEditingActivity` |
| `useDragMove` | drag a bar horizontally or across rows | `updateActivity` (+ `reParentActivity`) |
| `useDragResize` | drag a left/right edge | `updateActivity` |
| `useDragRowSpan` | drag a top/bottom edge | `updateActivity` (+ `reParentActivity`) |
| `useDragConnect` | drag from an anchor dot | `addDependency` |
| `useResizeSidebar` | drag the sidebar divider | `setSidebarWidth` (on every move) |

All follow the same shape: capture the pointer, keep live feedback in React local state,
pass it down as an override prop, and commit to the store exactly once on pointerup. That is
why a drag is one undo entry — and why a gesture needing two mutations must become a single
compound action.

`ActivityBar` does its own hit-zone dispatch against `EDGE_THRESHOLD` (12px): near the left
or right edge → resize, near the top or bottom → row span, otherwise → move.

## Rendering the arrows

`DependencyLayer` re-derives every arrow on each render:

```
getActivityRect(activity, rowY, unitWidth, rowSpan, rowHeight)
  → getAnchorPoint(rect, side)
  → routeOrthogonal(fromPt, fromSide, toPt, toSide, rowHeight)
  → pointsToSvgPath(points)
```

Routing produces axis-aligned polylines with a 12px step-out from each anchor, a midpoint
Z/S bend for same-orientation anchors, a single corner for mixed ones, and a detour when the
step-out points would cross. There is no obstacle avoidance and no separation between
parallel arrows.

Because the geometry is recomputed from the store rather than from drag overrides, arrows
track zoom and scroll but do not follow a bar while it is being dragged.

## Persistence

Two independent paths, both in `src/utils/persistence.ts` — see `data-model.md` for the
schema and keys.

- **Autosave** — `useAutoSave` writes both charts on a 1s debounce, a 30s interval, and
  `beforeunload`. Read back at store-init time.
- **Named saves** — `saveCurrentChart` / `loadSavedChart` plus an index used by `SaveDialog`.
- **Export / import** — JSON via the File System Access API with an anchor-download
  fallback; import runs `validateChart` then `migrateChart`.
- **Snapshot** — `snapshotGantt()` rasterises `[data-gantt-grid]` with `modern-screenshot`,
  writes a PNG to the clipboard and downloads a JPEG.

## Styling

Tailwind CSS v4 with an `@theme` token block in `src/index.css` and a `.dark` class override
block. `useTheme` toggles the `dark` class on `<html>` and persists to `gantt-theme`. shadcn
/ Radix primitives live in `src/components/ui/`.

## Where to start for a given change

| Task | Start at |
|---|---|
| Bar geometry, hit zones, context menu | `src/components/Activity/ActivityBar.tsx` |
| Anything about width, zoom or row height | `src/components/GanttChart/GanttChart.tsx` |
| Header tiers, week numbers, boundaries | `src/utils/timeline.ts` |
| A new field on an activity | `src/types/gantt.ts` → `chartSlice` → `migrateChart` |
| A new gesture | `src/hooks/` — copy the skeleton in `.claude/rules/drag-hooks.md` |
| A new toolbar control | `src/components/Toolbar/Toolbar.tsx` (599 lines; consider extracting) |
| Arrow routing | `src/utils/dependencyRouting.ts` |
