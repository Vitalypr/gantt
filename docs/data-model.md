# Data model and persistence

## Types (`src/types/gantt.ts`)

```ts
Activity = {
  id, name, color,
  startMonth,      // INTEGER UNIT OFFSET from chart start — a week index in weeks mode
  durationMonths,  // unit count, likewise
  order,
  isMilestone?,    // renders a diamond instead of a bar
  rowSpan?,        // bar spans N rows downward (default 1)
  annotation?,     // free text, shown via an icon on the bar
  fontSize?,       // per-activity override of uiSlice.globalFontSize
}

GanttRow = { id, name, order, activityIds, mergedWithNext? }

Dependency = { id, fromActivityId, toActivityId, fromSide, toSide }
             // sides are 'left' | 'right' | 'top' | 'bottom' — geometry only, no semantics

ViewSettings = { sidebarWidth, monthWidth, weekWidth?, rowSize,
                 showQuarters, timelineMode?, globalFontSize? }

GanttChart = { id, name, startYear, startMonth, endYear, endMonth,
               rows, activities, dependencies, viewSettings?, createdAt, updatedAt }

WeeksChart = /* member-for-member identical to GanttChart */
```

Three things to internalise:

1. **`startMonth` is not a date.** It is an offset from the chart's start, so the same
   number means a different calendar month if the chart start moves. `setDateRange`
   compensates by shifting every activity, which is why bars keep their calendar position
   when you change the range.
2. **Weeks mode reuses `startMonth` / `durationMonths` as week indices.** Nothing in the type
   marks this. It is why `ActivityBar` has to branch just to render a `w` or `m` suffix.
3. **`WeeksChart` and `GanttChart` are structurally identical**, so TypeScript treats them as
   mutually assignable. This is the root cause of every mode-routing defect: the compiler
   cannot tell you that a months chart has been handed to `setWeeksChart`.

`GanttRow.mergedWithNext` merges *sidebar name cells* only. It is a purely visual grouping
reconstructed at render time by `buildMergeGroups()` in `Sidebar.tsx`, which elects a leader
row and suppresses the followers' names and borders. There is no logical grouping in the
model — no parent/child, no collapse, no rollup.

## Storage keys (`src/utils/persistence.ts`)

| Key | Written by | Contents |
|---|---|---|
| `gantt-autosave` | `useAutoSave` | the months chart + `viewSettings` |
| `gantt-weeks-autosave` | `useAutoSave` | the weeks chart |
| `gantt-chart-<id>` | `saveCurrentChart` | a named save |
| `gantt-chart-index` | `updateIndex` | `SavedChartEntry[]` — `{id, name, updatedAt}` |
| `gantt-theme` | `useTheme` | `'light'` \| `'dark'` |

Autosave runs on a 1s debounce, a 30s interval, and `beforeunload`. `loadAutoSave()` and
`listSavedCharts()` execute at *module init* inside the slice initialisers, so a `localStorage`
that throws prevents the app from booting at all.

Named-save deletion is outside zundo's `partialize` — **Ctrl+Z cannot undo it.**

## Migration (`migrateChart`)

Runs on autosave load and on import. Two shapes are accepted:

- **Current** — has a top-level `rows` array. Fields are copied one by one onto a fresh
  object, so untrusted keys in a hand-edited JSON file never reach state. `viewSettings` is
  re-validated field by field with defaults.
- **Legacy** — has a `disciplines` array. Each discipline becomes one or more rows; if a
  discipline held several activities, the first row keeps the discipline name and the rest
  are chained with `mergedWithNext` so the sidebar still shows one merged cell.
  `dependencies` is reset to `[]`, because the legacy format had none.

`migrateWeeksChart` is a defaults-only pass.

**When you add a field to `Activity`, `GanttRow` or `GanttChart`, update three places:**
the type, the field-by-field copy in `migrateChart`, and — if it is positional —
`setDateRange`'s rebase loop.

## Validation (`validateChart`)

Guards the **import path only**; the autosave load path skips it. It checks the top-level
required fields, that `rows` (if present) have `id` / `order` / `activityIds`, and that
activities have `id` / `startMonth` / `durationMonths`.

Known gaps, in rough order of impact:

- `dependencies` is never inspected. A non-array value passes validation and then throws in
  every `.filter` call downstream.
- No referential integrity: a dependency whose endpoints are missing, an `activityIds` entry
  with no matching activity, or an activity in no row are all accepted and preserved.
- `rowSpan` is not clamped against the number of rows below.
- `startMonth` is not clamped to the chart range.

A single `normalizeChart()` repair pass applied at every ingress point would close all of
these at once — see roadmap item R-17.

## Export format

Export writes the active chart as pretty-printed JSON, filename
`<slug>_<dd.mm.yy-hh.mm>.gantt.json`. With the File System Access API available it creates a
folder named after the chart and writes the file there; otherwise it falls back to a plain
anchor download.

The exported file is the same shape as the in-memory chart plus a `viewSettings` snapshot,
so an export is a complete, portable document — importing it restores both the data and the
view.
