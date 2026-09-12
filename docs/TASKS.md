# Task register

_Single source of truth for what is done and what is left. Updated as part of each change,
not afterwards._

Status: **done** = implemented, typechecked, unit-tested and validated in a real browser ·
**wip** = in progress · **todo** = not started.

Gates as of the last update: `tsc` 0 · `lint` **0 errors** · `vitest` **163 passing** ·
`playwright` **46 passing** (30 parked, see `e2e/features.spec.ts`) · `build` and
`build:single` both succeed.

## A. Direct requests

| # | Request | Status |
|---|---|---|
| A1 | dist-single always in sync with source | **done** |
| A2 | Analyse the folder, build accurate project context | **done** |
| A3 | Double-click adds two rows sometimes | **done** |
| A4 | Cannot add rows by double-click past ~7 | **done** |
| A5 | Drag bars between rows | **done** |
| A6 | Milestone as framed rectangle, not a rhombus | **done** |
| A7 | Per-bar frame colour, grey by default | **done** |
| A8 | More palette colours, same design | **done** |
| A9 | Per-bar font size — toolbar and right-click | **done** |
| A10 | Annotation button does not work | **done** |
| A11 | Every action undoable/redoable, robustly | **done** |
| A12 | Weeks mode: year line above months | **done** |
| A13 | RTL toggle, everything mirrored | **wip** |
| A14 | Full Hebrew: bar names, row names | **wip** |
| A15 | Month names auto-translated in RTL | **wip** |
| A16 | Architectural review, communal infrastructure | **wip** |
| A17 | Managed task list kept current | **done** |
| A18 | Hebrew holidays shaded half-transparent red, proportional | **done** |
| A19 | Gregorian months named in Hebrew (נובמבר), not the Hebrew calendar | **done** |
| A20 | Holistic, pattern-level fixes rather than per-site patches | **done** (ongoing discipline) |

## B. Roadmap — Tier 0/1 correctness

| id | Item | Status |
|---|---|---|
| R-01 | Stale pnpm junctions | **done** (survived) |
| R-02 | `public/` deleted from disk | **done** (survived) |
| R-16 | Packaged EXE opened blank | **done** (survived) |
| R-LINT | 19 ESLint errors | **done** (0 errors) |
| R-03 | View settings lost on reload | **done** |
| R-04 | Save writes the wrong chart in weeks mode | **done** |
| R-05 | Dependency arrows missing from the export | **done** |
| R-06 | Weeks-mode math defects | **done** |
| R-07 | DST-fragile date arithmetic | **done** |
| R-08 | Bar labels fail contrast (YIQ) | **done** |
| R-08b | Default bar colour clashes with UI accent | **done** |
| R-09 | Unguarded `localStorage` writes | **done** |
| R-10 | No `pointercancel` in five drag hooks | **done** |
| R-10b | Drag-create preview vs commit rounding | **done** |
| R-10c | Fast connect gesture drops the dependency | **done** |
| R-11 | One drag cost two undo presses | **done** |
| R-12 | No `:focus-visible` anywhere | **done** |
| R-13 | Sixteen unnamed icon buttons | **done** |
| R-13b | Undo/redo always enabled | **done** |
| R-14 | Delete behind modals; Caps Lock inverts undo | **done** |
| R-15 | No right-hand clamp on move/resize | **done** |
| R-17 | No referential-integrity pass at ingress | **done** |
| R-18 | No Vitest harness | **done** |
| R-21 | Milestone geometry defined twice | **done** |
| R-27 | Unconfirmed destructive delete; `alert()` | **done** |
| R-28a | Dark-mode snapshot comes out light-on-white | **done** |
| R-28c | Snapshot button is a floating promise | **done** |

## C. Roadmap — Tier 2 visual system

| id | Item | Status |
|---|---|---|
| R-12b | No `prefers-reduced-motion` guard | **done** |
| R-22 | No declared z-index scale | **done** (tokens) |
| R-23 | No type scale | **done** (tokens) |
| R-24 | Header tiers undifferentiated | **done** |
| R-25 | Four grid tiers render as two | **done** |
| R-25b | Grid stops at the last row | **done** |
| R-26 | `--shadow-bar` applied nowhere | **done** |
| R-29 | Clipped labels with no fallback | **done** |
| R-35 | Merged sidebar cells hit-test wrong | **done** |
| R-37 | DM Sans loaded from Google Fonts | **done** |
| R-38 | Toolbar overcrowding | **done** |

## D. Roadmap — Tier 4 engineering health

| id | Item | Status |
|---|---|---|
| R-19 | No CI | **done** |
| R-20 | CLAUDE.md restructured | **done** (survived) |
| R-30 | Per-frame O(n²) work in `TimelineBody` | **done** |
| R-36 | Repo hygiene | **done** (survived) |
| R-40b | Unify `chart` / `weeksChart` behind one type | **done** |
| R-46 | Generate the Help dialog from a manifest | **done** |

## E. Roadmap — Tier 3 features

| id | Item | Status |
|---|---|---|
| R-31 | Cursor-anchored zoom and presets | **done** |
| R-32 | Duplicate activity, copy/paste | **done** |
| R-33 | Named vertical markers | **done** |
| R-34 | Manual progress shading | **done** |
| R-39 | Keyboard editing | **done** |
| R-40 | Print / PDF export | **done** |
| R-28b | SVG snapshot output | **done** |
| R-41 | Find and jump-to-activity | **done** |
| R-42 | In-chart legend | **done** |
| R-43 | Alignment guides / snap | **done** |
| R-44 | Row groups with collapse | **done** |
| R-45 | Templates | **done** |
| R-12c | Multi-select | **done** |
