# Gantt Chart

> **⚠️ Work in progress — read the handoff before doing anything else.**
> It carries the current status, the agreed order of remaining work, and the gotchas that
> cost real time to rediscover. Imported (not just linked) so it survives `/compact`.
> Delete this block and the file when the work lands.
>
> **Rule — update `docs/HANDOFF.md` as part of finishing each major feature or fix, in the
> same change, not afterwards.** Move the item out of "Outstanding work"; delete status that
> is no longer true rather than appending to it; add any gotcha that cost more than a few
> minutes to find. The handoff must read as the current state, never as a changelog — if it
> is growing monotonically, it is being written wrong.
>
> @docs/HANDOFF.md

Offline-first React SPA for **drawing** program-plan charts. No backend, no router, no
scheduling engine. Dependency arrows are decorative geometry, not constraints — nothing
recalculates when a bar moves. The deliverable is an exported image or a JSON file.

Keep that character in mind before adding features: auto-scheduling, critical path, typed
FS/SS/FF/SF dependencies, resources and baselines are all **deliberately out of scope**
(rationale in `docs/improvement-roadmap.md`).

## Commands

Package manager is **pnpm**.

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server |
| `pnpm build` | `tsc -b && vite build` → `dist/` |
| `pnpm lint` | ESLint (currently **fails** — see roadmap R-LINT) |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm build:single` | One self-contained HTML file → `dist-single/` (**tracked** — see below) |
| `pnpm build:exe` | Standalone Windows EXE → `dist-exe/` |
| `pnpm deploy:gh` | Build + publish `dist/` to gh-pages |

If any script dies with `Cannot find module .../node_modules/<tool>`, the pnpm junctions
are stale (the repo has been moved). Fix: `CI=true pnpm install`.

## Non-obvious invariants

These cause real bugs when violated and cannot be inferred from a quick read.

- **Two charts live in one store.** `chart` (months) and `weeksChart` (weeks) coexist.
  Every `chartSlice` mutator routes through the private `withActive(state)` helper keyed on
  `uiSlice.timelineMode`. `GanttChart` and `WeeksChart` are *structurally identical* types,
  so TypeScript cannot catch cross-mode misrouting — check the mode by hand.
- **`Activity.startMonth` is an integer unit offset from chart start, not a date.** In weeks
  mode the same field holds a *week* index. `durationMonths` likewise counts units.
- **Changing the chart date range rebases every activity** so bars keep their calendar
  position (`setDateRange` in `chartSlice.ts`). Adding a positional field means teaching
  that rebase about it.
- **One user gesture must be one store commit**, or it costs two Ctrl+Z presses. zundo
  records a history entry per `set()` that changes the chart reference, and every mutator
  bumps `updatedAt`.
- **UI state is outside undo history.** `partialize` keeps only `{chart, weeksChart}`, which
  is why `selectedActivity` / `editingActivity` can dangle at a deleted id after an undo.
- **`dist-single/index.html` is a tracked build artifact, not a throwaway.** It is the
  distributable, so it must never lag `src/`. `.githooks/pre-commit` rebuilds and stages it
  whenever a commit touches `src/`, `public/`, `index.html`, `package.json` or the
  single-file vite config; `package.json`'s `prepare` script points `core.hooksPath` at
  `.githooks` on install. The build is deterministic, so an unchanged bundle produces no
  diff. `.gitattributes` marks the file `-text` — the inlined bundle contains raw CR bytes
  and `core.autocrlf=true` would otherwise rewrite them on checkout. Everything else in
  `dist-single/` is a copy of `public/` and stays ignored, which means a clone has the HTML
  but not `easter_egg.jpg`.

- **RTL is arithmetic, not CSS.** `utils/timeline.ts` owns every index→pixel conversion
  (`unitSpanToLeft`, `xToUnit`, `deltaToUnits`, `dateToUnitOffset`). `direction: rtl` is
  deliberately NOT used on the grid — it does not move physical `left` and it inverts the
  scroll origin. Dependencies persist TEMPORAL sides and resolve to physical ones at render
  through `resolveAnchorSide`.
- **`Chart` is a discriminated union** on `unit: 'month' | 'week'`. Narrow on it; do not
  re-type the mode branch. Read the active chart via `activeChart()` in `stores/selectors.ts`.
- **View settings have one parser** (`utils/viewSettings.ts`) with a compile-time key list.
  Adding a field means type + key list + parser, and a test enforces the round trip.
- **`GanttRow.mergedWithNext` is purely cosmetic** — it merges sidebar name cells. There is
  no logical grouping in the data model.

## DOM contracts

Code measures the live DOM instead of threading geometry through props. Keep these
attributes and their meaning intact:

| Selector | Meaning |
|---|---|
| `[data-gantt-scroll]` | The single scroll container; `scrollLeft`/`scrollTop` source |
| `[data-gantt-grid]` | Snapshot capture root — **anything inside it ships in the exported image** |
| `[data-timeline-body]` | Origin for every pointer→chart coordinate conversion |
| `[data-activity-bar]` | Marks a bar/milestone; hit-tests use `closest()` on it |
| `[data-sidebar-row]` | Sidebar row cell |

## Conventions that differ from defaults

- Named exports only. No default exports anywhere.
- `type` over `interface`; `as const` unions over `enum`; `unknown` over `any`.
- `strict` + `noUncheckedIndexedAccess` are on — indexed access yields `T | undefined`.
  The codebase uses `!` after bounds-checked lookups; keep that style rather than adding
  optional chaining that hides a real invariant.
- Design tokens live in the `@theme` block of `src/index.css` with a matching `.dark`
  override. Do not hardcode a hex in a component.
- `@/` is the alias for `src/`.

## Where the detail lives

Path-scoped rules under `.claude/rules/` load automatically when you open the matching
files — `stores.md`, `timeline-math.md`, `drag-hooks.md`, `ui-components.md`.

Human-facing reference (read on demand, not auto-loaded):

- `docs/architecture.md` — how the layers fit together, render and event flow
- `docs/data-model.md` — persisted schema, storage keys, migration
- `docs/build-and-distribution.md` — the four build modes and their base-path traps
- `docs/improvement-roadmap.md` — prioritised backlog and the known-defect register

<!-- Maintainer note: keep this file under ~120 lines. Content Claude can derive by reading
the code (directory trees, constant tables, dependency lists) belongs in docs/, not here.
@imports do NOT reduce context — they expand at launch. Only .claude/rules/ with `paths:`
frontmatter and per-directory CLAUDE.md files load lazily. -->
