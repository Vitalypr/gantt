---
paths:
  - "src/stores/**/*.ts"
  - "src/utils/persistence.ts"
  - "src/hooks/useAutoSave.ts"
---

# Store and persistence rules

## Middleware order

`src/stores/index.ts` composes `temporal(immer(...))` — immer inside, zundo outside. The
three slices spread flat into one object; do not introduce a nested namespace.

Slice composition goes through an `AnyArgs` cast, and each slice re-declares the cross-slice
fields it reads as a hand-written intersection (`ModeDeps` in `chartSlice`,
`PersistenceDeps` in `persistenceSlice`). **Cross-slice typing is therefore unchecked.** If
you add a field one slice reads from another, add it to that intersection too, or the error
will only show up at runtime.

## Undo (zundo)

`partialize` returns `{chart, weeksChart}`, and the custom `equality` predicate compares
those two by reference. Every mutator bumps `updatedAt`, so **every `set()` that touches a
chart pushes a history entry.** Limit is 50.

Consequences to respect:

- A gesture that needs two mutations (e.g. move + re-parent) must be a single compound
  action on the slice, not two calls from the hook. Two calls = two Ctrl+Z presses and an
  intermediate state the user never created.
- UI state (selection, editing, zoom, mode, rowSize, fonts) is intentionally *outside*
  history. Undo can therefore leave `selectedActivity` / `editingActivity` pointing at an id
  that no longer exists — guard reads of those.
- There is no `handleSet` throttle. Wiring an `onChange` handler straight to a chart mutator
  would flood the 50-entry history in a few keystrokes; commit on blur/pointerup instead.

## Mode routing — the sharpest edge in this file

`chart` (months) and `weeksChart` (weeks) are both live at all times. Reads go through
`active(get())`, writes through `withActive(state)` inside the immer draft; both pick based
on `uiSlice.timelineMode`.

`MonthsChart` and `WeeksChart` are `Chart<'month'>` and `Chart<'week'>`, and `Chart` is a
genuine discriminated UNION - only a union lets `if (chart.unit === 'week')` narrow. They used
to be member-for-member identical and therefore mutually assignable, which is where every mode
bug came from. Read the active chart through `activeChart(state)` in `stores/selectors.ts`
rather than re-typing the mode branch.

## View settings

Three hands touch view settings - capture, persist, parse - and a field missing from any one
of them is dropped SILENTLY on reload, with no error anywhere. That happened twice.

- `captureViewSettings()` / `restoreViewSettings()` on `persistenceSlice` are the canonical
  pair. Nothing may hand-roll a subset; `useAutoSave` reads the capture reactively through
  `useShallow`, and `App` restores through it on mount.
- `utils/viewSettings.ts` owns parsing, with `VIEW_SETTING_KEYS` checked against
  `keyof ViewSettings` at compile time. `migrateChart` calls it rather than listing fields.
- `src/test/view-settings.test.ts` asserts the round trip over that key list.

Adding a `ViewSettings` field means: add it to the type, to `VIEW_SETTING_KEYS`, and to the
parser. The compiler and that test fail if you miss one.

## localStorage

Save, load, export and import are all mode-aware, and `Chart` is a discriminated union on
`unit`, so routing a chart into the wrong slot is a compile error rather than a silent
overwrite. `SavedChartEntry.mode` records which chart a save came from.

Keys are owned by `src/utils/persistence.ts` and must not be re-derived elsewhere:

- `gantt-autosave`, `gantt-weeks-autosave` — debounced autosave (1s) + 30s interval + `beforeunload`
- `gantt-chart-<id>` + `gantt-chart-index` — named saves
- `gantt-theme` — owned by `useTheme`

`loadAutoSave()` and `listSavedCharts()` run at *module init* (in the slice initialisers),
so a throwing `localStorage` blank-screens the app at boot. Every write path must be
failure-tolerant; every read path already is.

Deletion of a named save is outside `partialize` — **Ctrl+Z cannot recover it.** Anything
destructive at this layer needs an explicit confirmation step.

## Data ingress

`migrateChart()` converts the legacy `disciplines` shape to flat rows and picks only known
fields, so untrusted keys never reach state. `validateChart()` guards the *import* path only
— the autosave load path skips it.

Any new ingress point must also preserve referential integrity: dependencies whose endpoints
are gone, `activityIds` with no matching activity, activities in no row, and `rowSpan`
larger than the rows below it are all currently accepted and will crash or render wrong
downstream.
