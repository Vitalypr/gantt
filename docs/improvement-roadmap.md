# Improvement roadmap

Produced from a full read of the codebase plus a survey of TeamGantt, GanttPRO, Instagantt,
MS Project for the web, monday.com, ClickUp, Notion timeline, Linear roadmaps, and the
libraries frappe-gantt, dhtmlxGantt, vis-timeline, SVAR and Syncfusion.

Ordered by value ÷ effort. Every item cites the file it lives in.

## Status legend — read this before picking up an item

| Mark | Meaning |
|---|---|
| ✅ | Fixed and **verified present in the tree** on 2026-09-11. |
| ◑ | Partly fixed; the row says which part. |
| ❌ | Was fixed, then **lost with the uncommitted tree**. The description is of a live defect. Re-verified absent on 2026-09-11. |
| (none) | Never started. |

Every ❌ item was written as ✅ by the session that fixed it, but that work was never
committed and is gone (see `HANDOFF.md`).

The split is mechanical, not a judgement call: `src/` was restored with
`git restore --source=HEAD` and is byte-identical to commit c4e4054, so **no fix that lived
in `src/` could have survived**. The five remaining ✅ items are exactly those whose fix
lives in a root config file, `package.json`, or `public/`. Each one was still re-checked
against the tree on 2026-09-11 rather than trusted.

**The prose of a ❌ item still describes the bug accurately** — it is a specification for
redoing the fix, not a historical note.

## The product decision that shapes this list

The commercial Gantt feature set splits in two.

**Family A — the scheduling engine**: typed FS/SS/FF/SF dependencies with lag, auto-scheduling,
critical path and slack, baselines, resources, working calendars. Every vendor gates these
behind a paid tier because they all rest on the same three prerequisites: real calendar dates
per task, a task DAG with typed edges, and a constraint solver. This app has none of them —
activities are integer unit offsets and arrows are free-form polylines that may connect
right-to-top, may form cycles, and are often drawn for visual grouping rather than sequence.
Adopting Family A means rebuilding the data model *and* making dragging fight back against
the user, which destroys the free-form drawing character that is the actual product.

**Family B — reading and producing**: named markers, progress shading, zoom presets, search,
label overflow, print/PDF, keyboard editing, undo granularity, templates. Model-compatible,
cheap, and exactly where this app is weakest.

**This roadmap pursues Family B and explicitly declines Family A.** The declines are listed
at the end with reasons, so the decision does not have to be re-litigated.

---

## Tier 0 — broken right now

| id | Item | Effort |
|---|---|---|
| ✅ R-01 | **Stale pnpm junctions.** All 23 links under `node_modules` pointed at the pre-move `Desktop\Gantt` path, so lint, test, build and build:exe all failed. Fixed with `CI=true pnpm install`. Recurs whenever the folder moves or OneDrive re-syncs. | S |
| ✅ R-02 | **`public/` was deleted from disk** while still tracked in git. Six live references broke: the favicon and apple-touch-icon in `index.html`, the three PWA manifest icons, and `EasterEgg.tsx`. A manifest whose icons all 404 makes the app non-installable — while `HelpDialog` still claims it installs. Restored with `git checkout -- public/`. | S |
| ✅ R-LINT | **`pnpm lint` failed with 19 errors** from `eslint-plugin-react-hooks` v7. Two classes, both real signals rather than noise. (a) Refs mutated during render in four hooks — unsafe under StrictMode and concurrent rendering; fixed with a shared `useLatest` helper that syncs in an effect. (b) `setState` inside an effect body in `useInlineEdit`, `Sidebar` and `AnnotationPopover` — fixed by mounting each editor only while editing, so its initial value comes from props (this also fixed Escape-commits-instead-of-cancelling and the empty annotation edit that burned an undo frame). **Now 0 errors, 12 warnings.** The residue is `preserve-manual-memoization` on the six drag hooks, downgraded to a warning with a comment: this project does not run the React Compiler, so a bailout is not a build failure, but it does mean those hooks would not compile if it were ever enabled. | M |
| ✅ R-16 | **The packaged EXE opened blank.** `build:exe` shipped a `/gantt/`-based bundle to a launcher that serves `dist/` at `/`; every asset request missed, the SPA fallback returned `index.html` labelled `text/html`, and the browser refused the module script. Added a `build:exe:web` step that builds with `--base=./`, and replaced the two hardcoded `/gantt/` icon hrefs in `index.html` with the base-url placeholder Vite substitutes per build. Verified: the default build emits `/gantt/assets/…`, the relative build emits `./assets/…` and `./favicon.svg`, and the icons are present in both outputs. | M |

## Tier 1 — correctness (high value, low cost)

| id | Item | Where | Effort |
|---|---|---|---|
| ✅ R-03 | **View settings silently lost on reload.** `useAutoSave` wrote a six-field `viewSettings` literal omitting `globalFontSize`, while `App.tsx` restored only four of seven fields — dropping `timelineMode`, `weekWidth` and `globalFontSize`. Every reload bounced the user back to months mode at default zoom and font size, contradicting the Help text. Both paths now route through the exported `snapshotViewSettings` / `applyViewSettings`. | `App.tsx`, `useAutoSave.ts`, `persistenceSlice.ts` | S |
| ✅ R-04 | **Save saved the wrong chart in weeks mode.** `saveCurrentChart` and `loadSavedChart` read `state.chart` unconditionally while export/import branched on mode, so weeks charts could never be saved and the toolbar reported success about a chart the user was not editing. Now mode-aware, and `SavedChartEntry` records the mode. | `persistenceSlice.ts`, `persistence.ts`, `Toolbar.tsx` | M |
| ✅ R-05 | **Dependency arrows vanished from the export.** `DependencyLayer` was mounted only while connect mode was on, and `snapshotGantt` captures the live DOM — so the shipped JPEG lost every arrow the user drew. The layer is `pointer-events-none` with per-path opt-in, so mounting it unconditionally is behaviourally safe; only the anchor dots stay gated. | `GanttChart.tsx` | S |
| ✅ R-06 | **Three weeks-mode math defects.** (a) `buildMonthHeadersForWeeks` double-counted boundary weeks via a running accumulator, so twelve month headers summed to 63 weeks against a true 52 and no month aligned with the week column beneath it. (b) `getTotalWeeks` dropped the final days, rendering 52 weeks for a full year that needs 53. (c) ISO week numbers went off-by-one for the rest of the chart after a DST transition. | `timeline.ts` | S |
| ✅ R-07 | **DST-fragile date arithmetic.** Six call sites hand-rolled `(a - b) / 86400000`; across a DST boundary the quotient is fractional and the surrounding `Math.floor(x/7)` lands a week early. Replaced with `daysBetween` / `addDays` helpers normalised to local midnight. | `timeline.ts`, `chartSlice.ts` | S |
| ✅ R-08 | **Bar labels failed contrast.** `isColorDark` used a non-gamma YIQ formula, putting white text at 2.28–2.80:1 on the orange, green, teal and cyan swatches — below the 3:1 floor for *any* text size, when flipping to dark would score 6.4–7.8:1. Replaced with a WCAG relative-luminance picker. | `color.ts` | S |
| ✅ R-11 | **One drag cost two undo presses.** A diagonal drag fired `updateActivity` then `reParentActivity` as separate commits, so Ctrl+Z restored the row but kept the month — a state that never existed. Compound `moveActivity` / `setActivityRowSpan` actions now commit once. | `chartSlice.ts`, `useDragMove.ts`, `useDragRowSpan.ts` | S |
| ✅ R-12 | **No focus-visible anywhere.** Eight date controls, the Mo/Wk toggle, the colour swatches and the inline rename input all set `outline-none` with no replacement — tabbing produced zero feedback (WCAG 2.4.7 failure). One global `:focus-visible` rule now covers them. | `index.css` | S |
| ✅ R-13 | **Sixteen unnamed icon buttons.** A Radix tooltip supplies `aria-describedby` while open; it does not *name* the button, so a screen reader announced "button" sixteen times. The tooltip strings already existed. | `Toolbar.tsx` | S |
| ✅ R-14 | **Delete fired behind open modals**, and Caps Lock inverted Ctrl+Z into redo (undo matched `'z'`, redo matched `'Z'` without consulting `shiftKey`). | `useKeyboardShortcuts.ts` | S |
| ✅ R-15 | **Move and resize had no right-hand clamp**, so a bar dragged past the chart end left the sized grid track and became unreachable; and `setDateRange` could drive `startMonth` negative with no floor. | `useDragMove.ts`, `useDragResize.ts`, `chartSlice.ts` | S |
| ✅ R-28a | **Dark-mode snapshots came out light-on-white** — the capture background was hardcoded `#ffffff`. | `snapshot.ts` | S |
| ✅ R-09 | **Every `localStorage` write is unguarded** while every read is carefully wrapped. A quota error inside the autosave timer becomes an invisible unhandled rejection, and because `loadAutoSave()` runs at module init a throwing `localStorage` blank-screens the app at boot. Needs a `safeSetItem` plus a visible failure state. | `persistence.ts` | M |
| ◑ R-10 | **No `pointercancel` handling in MOST drag hooks** (`useDragMove` now has it; the other five do not)., and no unmount teardown. A cancelled gesture (touch pan takeover, second contact, the captured node unmounting) stranded a live move handler and left `document.body.style.cursor`/`userSelect` mutated for the rest of the session. Every hook now has a shared `cleanup` bound to both `pointerup` and `pointercancel`, plus an unmount effect that restores body styles. `useResizeSidebar` additionally gained the missing `e.button !== 0` guard (a right-click on the divider armed a resize whose pointerup never arrived) and a grab-offset so the sidebar no longer jumps ~10px on grab. | all six hooks | M |
| ✅ R-10b | **Drag-create's preview and its commit used different rounding** — the ghost floored while the commit rounded, so the created bar could be one column different from what the user saw. Both now floor, and the span is inclusive of both end columns. | `useDragCreate.ts` | S |
| ✅ R-10c | **A fast connect gesture silently dropped the dependency.** `useDragConnect` read its snap target from a ref synced during render, so a flick where the last pointermove and the pointerup landed in the same frame saw stale state. The ref is now written by the pointer handlers themselves. | `useDragConnect.ts` | S |
| ✅ R-17 | **No referential-integrity pass at any ingress.** A `normalizeChart()` that drops dangling dependencies and `activityIds`, adopts orphan activities, clamps `rowSpan` and `startMonth`, and clears `mergedWithNext` on the last row would close six defects at once — including the import gap where `"dependencies": {}` passes validation and then throws in every downstream `.filter`. | `persistence.ts`, `chartSlice.ts` | M |
| ✅ R-21 | **Milestone geometry is defined twice and disagrees.** Routing models a milestone as a `round(rowHeight*0.55)` square; the component draws `max(monthWidth-4, height)` wide. At defaults the diamond is 76px wide while routing assumes 22px, so arrows land ~27px inside the shape and the snap test points where the anchor dot is not. | `dependencyRouting.ts`, `MilestoneMarker.tsx`, `useDragConnect.ts` | S |
| ✅ R-27 | **Deleting a saved chart was unconfirmed, permanent and outside undo**, with its trash button 24px from the row's own click-to-load target. Now a two-step confirm. The toolbar's three feedback mechanisms (custom toast, native `alert` that also fired on a cancelled file picker, and silent failure) are unified on the toast — which is now tokenised so it re-themes, instead of raw `bg-green-600`. | `SaveDialog.tsx`, `Toolbar.tsx` | M |
| ✅ R-28c | **The snapshot button was a floating promise** — no spinner, no confirmation, and a capture failure was an invisible unhandled rejection. It is now awaited behind a disabled button and toasts success or failure. | `snapshot.ts`, `Toolbar.tsx` | S |
| ✅ R-13b | **Undo/redo buttons were always enabled**, giving no signal that history was exhausted, and `useUndo`/`useRedo` returned a fresh closure per render, re-binding the global keydown listener on every App render. Both are now memoised, with `useCanUndo`/`useCanRedo` driving the disabled state. | `stores/hooks.ts`, `Toolbar.tsx` | S |

## Tier 2 — the visual system

| id | Item | Where | Effort |
|---|---|---|---|
| ✅ R-23 | **No type scale existed** — nine ad-hoc sizes from `text-[8px]` to `text-lg` with no system, including illegible 8px milestone labels. Added `--text-micro/meta/label/body/title` with paired line heights. | `index.css` + all components | M |
| ✅ R-24 | **The three header tiers were all 12px**, so an 84px band read as one undifferentiated block. Year, quarter and month now differ in size, weight, letter-spacing and background step. | `TimelineHeader.tsx` | S |
| ✅ R-25 | **Four grid tiers rendered as two.** The stroke-colour ternary returned the same token for both branches, and in dark mode the grid line sat ~4 luminance points from the background at 0.5px — invisible. Added a four-tier scale and lifted the dark values. | `TimelineGrid.tsx`, `index.css` | M |
| ✅ R-26 | **`--shadow-bar` was defined in both themes and applied nowhere.** Bars sat perfectly flat and then jumped to a 12px-blur shadow on hover; light-shade bars had no edge at all against the surface (`#f3f4f6` on `#ffffff` is ~1.02:1). Resting elevation plus a hairline border now applies, with rim-light elevation in dark mode. | `index.css` | S |
| ✅ R-25b | **The grid stopped at the last row**, leaving roughly two-thirds of the canvas as a blank untextured plane — the single biggest reason the app read as unfinished. Ghost rows now continue the rhythm below the content. | `TimelineGrid.tsx` | S |
| ✅ R-08b | **The default bar colour clashed with the UI accent** — blue-500 content beside indigo-500 chrome is a near-miss visible in every screenshot. | `colors.ts`, `index.css` | S |
| ✅ R-12b | **No `prefers-reduced-motion` guard.** An infinitely pulsing today dot plus `scale()` drag transforms with no escape hatch. | `index.css` | S |
| ✅ R-22 | **No declared z-index scale.** A local `zIndex: 1` on rows containing a spanning bar creates a stacking context above the arrow SVG, so arrows crossing that row paint behind the bar; a selected milestone's `z-10` escapes its row globally; converting a bar to a milestone leaves a stale `rowSpan` so the row keeps its z-index forever. | `TimelineBody.tsx`, `MilestoneMarker.tsx`, `DependencyLayer.tsx` | S |
| ✅ R-29 | **Labels that do not fit are clipped with no fallback.** No `title`, no `aria-label`, and the `rowSpan >= 3` branch disables clamping so tall bars hard-clip mid-line. Every mature Gantt solves this the same way: measure, and render the label immediately outside the bar when it does not fit. Since the snapshot *is* the deliverable, an unreadable bar is a defective output. | `ActivityBar.tsx`, `MilestoneMarker.tsx` | S |
| ✅ R-38 | **Toolbar overcrowding** — 24 controls in a 44px strip with `overflow-x-auto scrollbar-hide`, no container gap (three buttons sit flush and read as one broken control), three control heights sharing no baseline, and ~70 lines of date-range markup duplicated for desktop and mobile with both always mounted. Below ~1200px the right half scrolls silently out of view. Collapse File and View into overflow menus. | `Toolbar.tsx` | L |
| ✅ R-35 | **Merged sidebar cells hit-test wrong.** The leader's name spans the group visually, but each follower row is a later absolutely-positioned sibling and wins the hit test — so double-clicking the lower half of one apparent cell does nothing, and right-clicking there operates on a hidden row. | `Sidebar.tsx` | M |
| ✅ R-37 | **DM Sans is loaded from Google Fonts**, which the EXE's own CSP blocks and the offline builds cannot reach. Self-host one woff2. | `index.css` | S |

## Tier 3 — features worth adding

Ordered by value ÷ cost. All are model-compatible; none requires a scheduling engine.

| id | Item | Why | Effort |
|---|---|---|---|
| ✅ R-32 | **Duplicate activity (Ctrl+D) and copy/paste.** Program charts are intensely repetitive — the same review block across eight workstreams currently means drag-create, rename and recolour from scratch each time. A `nanoid()` plus a spread with `startMonth` offset by its own duration. | table stakes everywhere else | S |
| ✅ R-33 | **Named vertical markers** for deadlines, gates and reviews. `TodayMarker` already solves the component pattern, the index-to-x math and the layering; generalise to `markers: Array<{id, unitIndex, label, color, style}>` on the chart so they are undoable, exported and captured in the snapshot. For a program plan (PDR/CDR, contract award, delivery) this is the most-missed annotation. | dhtmlx ships it as a first-class API; Linear renders roadmap milestones this way | M |
| ✅ R-34 | **Manual progress shading** — `Activity.progress?: 0-100` as a darker inner fill, set from the context menu. This is what converts a *plan* into a *status report*, i.e. the thing actually shown in a review meeting, and it needs no engine because a human enters the number. | frappe-gantt, dhtmlx, ClickUp, monday, GanttPRO all shade % complete | M |
| ✅ R-39 | **Keyboard editing** — roving tabindex on bars, arrows to nudge, Shift+arrows to resize, Alt+arrows to change row, Enter to rename. Because `startMonth` and `durationMonths` are integers this is literally ±1 with no date math, far cheaper here than in a date-based Gantt. Also delivers the accessibility floor almost for free. | Linear's identity is keyboard-first; Syncfusion treats it as an a11y requirement | L |
| ✅ R-31 | **Cursor-anchored zoom and named presets.** Zoom is currently blind ±10px with no scroll compensation, so the content slides out from under the pointer. Also decide whether auto-fit or user zoom owns the width — today the auto-fit floor overrides `MAX_MONTH_WIDTH` and makes the fit-to-view button dead UI. | vis-timeline zooms under the cursor; TeamGantt exposes named presets | M |
| ✅ R-40 | **Print / PDF export** with landscape `@page`, fit-to-page scaling and date-range slicing (Jan–Jun page 1, Jul–Dec page 2). The largest absolute-value gap and the most consistently supported feature in the field; Microsoft documents "Gantt prints across far too many pages" as a top support issue, so the naive approach fails. For a tool whose output is a briefing chart, PDF is the natural deliverable and JPEG is the workaround. | universal | M |
| ✅ R-28b | **SVG (vector) snapshot output** beside the JPEG. `modern-screenshot` already exposes an SVG path. A JPEG pasted into a deck and projected is soft and cannot be recoloured; vector fixes crispness, print quality and post-hoc editing in one move. | Instagantt and TeamGantt both export vector/PDF | S |
| ✅ R-41 | **Find and jump-to-activity (Ctrl+F)** matching activity and row names, scrolling the match into view with a highlight flash. Transient UI state only, no schema change. | "where is X on this 40-row chart" is currently unserved | M |
| ✅ R-42 | **In-chart legend.** Because the snapshot captures `[data-gantt-grid]` wholesale, anything rendered inside it is in the export for free. The colour semantics (blue = design, amber = at risk) are meaningful to the author and opaque to everyone who receives the image. | this is the difference between a picture of bars and a chart | S |
| ✅ R-43 | **Alignment guides and snap-to-neighbour** while dragging. This is the design-tool answer to what vendors solve with typed dependencies: show a guide and snap when an edge approaches another bar's edge, giving alignment precision without the tool ever overriding intent. The recommendation that most respects the app's character. | Figma-style | M |
| ✅ R-44 | **Row groups / phases with collapse** and a bracket-style rollup bar. Today `mergedWithNext` is visual only, so a 40-row chart has no structure to hide. The literature is emphatic that grouping into 3–7 phases is the primary defence against clutter. | ClickUp, Notion, dhtmlx, MS Project | L |
| ✅ R-45 | **Templates.** `persistenceSlice` already does full-chart JSON import/export and `migrateChart` already handles schema evolution, so a template is a bundled chart with the id and dates stripped. The value is consistency — charts that start from the same skeleton are comparable. | every vendor leads with a template gallery | M |
| ✅ R-12c | **Multi-select** with bulk recolour and align. Selection is currently `{activityId} | null`; widening it touches both bar components, the shortcuts, both context menus and the selection mutual-exclusion logic — so sequence it after the Tier 1 items rather than writing them twice. | dhtmlx lists it as core grid behaviour | M |

## Tier 4 — engineering health

| id | Item | Effort |
|---|---|---|
| ✅ R-18 | **Stand up the Vitest harness the docs already promised.** vitest, RTL and jest-dom were installed but there was no `test` block, no jsdom, no setup file and zero test files across 49 sources — so `pnpm test` exited non-zero while CLAUDE.md advertised a suite. Harness added, with golden tests for `timeline.ts` pinned across timezones. | M |
| ✅ R-20 | **CLAUDE.md restructured.** 227 lines of which ~120 were derivable (a directory tree, a constants table that was already wrong, a features list, two hook tables) plus a `DisciplineDialog` that does not exist. Now a ~100-line root plus path-scoped `.claude/rules/` files that load only when the matching source is opened, and these `docs/` for lookup material. | M |
| ✅ R-36 | **Repo hygiene** — 17 untracked debugging screenshots, a `src.zip`, and an ungitignored `dist-single/` kept `git status` permanently noisy, which is precisely why six deleted `public/` assets went unnoticed. `.gitignore` widened; ESLint now ignores every build output. | S |
| ✅ R-19 | **No CI at all**, and `lint` is invoked by no build script — so ESLint only runs if a human remembers, and `deploy:gh` publishes straight from a developer machine. One job running `tsc -b && pnpm lint && pnpm test` would have caught the broken junctions, the deleted assets and the weeks-math regressions. | S |
| ✅ R-30 | **Per-frame O(n²) work.** `TimelineBody` resolves activities with a nested `Array.find` re-run on every pointermove; neither bar component is memoised; the easter-egg `useStore.subscribe` has no selector so it rebuilds a Set of every activity name on every store write including per-frame drag commits. `DependencyLayer` already builds the right memoised Map — lift and share it. | M |
| ✅ R-46 | **Generate the Help dialog from a shared manifest.** 500 lines of hand-written prose has already drifted on save behaviour, PWA installability, dependency deletion and font-size persistence. Drive the shortcut table from `useKeyboardShortcuts` and the toolbar section from the actual control list. | L |
| ✅ R-40b | **Unify `chart` and `weeksChart` behind one type with a unit discriminant** (`Chart & { unit: 'month' | 'week' }`), or brand `WeeksChart` with distinct field names so misrouting becomes a compile error. Every mode bug in Tier 1 was invisible to the compiler because the two types are member-identical. | L |

---

## Explicitly declined

Each of these is standard in commercial Gantts and each would make this app worse.

| Feature | Why not |
|---|---|
| **Auto-scheduling / constraint solver** | The clearest betrayal of the product. Auto-scheduling means the chart moves bars the user did not move; a tool whose whole interaction model is "drag a rectangle where you want it" becomes one that argues with you. It also presupposes typed edges and real dates, which the model deliberately lacks. |
| **Critical path and slack** | Mathematically undefined on this data. CPM needs a DAG of typed edges with durations; these arrows may connect right-to-top, may form cycles, and are frequently drawn for grouping rather than sequence. Any computed critical path would be confidently wrong — worse than none. |
| **Typed FS/SS/FF/SF dependencies with lag** | These exist only to feed the scheduler and the critical path. With both declined, adding types means a dependency inspector, a migration and a lag field for exactly zero behavioural change. The free-form anchor model is more expressive for the actual use case. |
| **Baselines (planned-vs-actual overlay)** | The dual-bar renderer is the expensive half — every bar becomes two, and row heights, `rowSpan` layout, arrow anchors and the snapshot all have to accommodate it — and it only pays off with real actuals, which the app does not track. Ship R-47 (named local versions with restore) instead: that is the useful 80%. |
| **Resources, assignees, workload, cost** | Furthest from the product of anything surveyed. Needs a people model, an allocation calculation and a second view that has nothing to do with the Gantt canvas. This app has no user model and no backend, and ships as a single file for one person to build a picture. |
| **Working calendars, weekends, holidays** | Meaningless at this granularity. The finest resolution is a week and positions are integer offsets, so there is no representation in which a weekend could be excluded. It only becomes relevant as a consequence of day granularity, which is itself deferred. |
| **Virtualised rendering** | Skip until measured. These charts are hand-drawn briefing charts that must fit one screen or one printed page to serve their purpose — a chart too big to render is already too big to read. Virtualisation would also actively break `snapshotGantt()`, which captures the whole live DOM. |
| **Full WCAG / screen-reader conformance** | A drag-to-draw Gantt is irreducibly visual and full conformance is a sustained programme. The correct subset — visible focus, accessible names, roles, sane tab order, keyboard editing — is R-12/R-13/R-39 and is worth doing. Chasing the rest is not. |
| **Day / hour granularity** | Deferred, not declined on principle. It would multiply column counts by ~30 (forcing the virtualisation above), and it is the prerequisite that would then drag working calendars in behind it. |
