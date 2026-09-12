# Handoff

_Updated 2026-09-12 · branch `feat/rtl-hebrew-holidays-and-roadmap` · committed at `ed9dfc1`, not pushed_

## State

All gates green: `tsc -b` 0 · `pnpm lint` **0 errors** (20 warnings) · `pnpm test` **163
passing** · `pnpm test:e2e` **47 passing** (30 parked) · `pnpm build` and `pnpm build:single`
both succeed. Verified on a clean Linux checkout of `ed9dfc1`, not just on the dev box.

`docs/TASKS.md` is the task register and `docs/improvement-roadmap.md` the defect register.
**Both are currently empty of open items.** Every roadmap entry is ✅ and verified present in
the tree, not inherited from the lost session's claims.

## Architecture, in one pass

Read these before changing geometry, state or persistence — each exists because a class of bug
kept recurring.

- **`utils/timeline.ts` is the only place a unit index becomes a pixel.** `unitSpanToLeft` /
  `xToUnit` / `deltaToUnits` / `clampStartUnit` / `dateToUnitOffset`. RTL is arithmetic
  mirroring, not `direction: rtl` — CSS `direction` does not move physical `left` and inverts
  the scroll origin. Anything that multiplies an index by a width elsewhere will be right in
  LTR and silently wrong in RTL.
- **`Chart` is a discriminated union** on `unit: 'month' | 'week'`. The two charts used to be
  identical types, so a misroute compiled fine; now it is a type error. Narrow on `chart.unit`.
- **One gesture, one commit.** `moveActivity`, `setActivityRowSpan`, `transformActivities`,
  `updateActivities`, `removeActivities` are compound so a gesture never costs two Ctrl+Z.
- **`utils/viewSettings.ts` is the single parser** for persisted view settings, with a
  compile-time key list. Three hand-kept copies is how fields were silently dropped on reload.
- **`hooks/useLatest.ts`** replaced every ref-written-during-render.
- **`normalizeChart`** runs at every ingress and repairs dangling ids, orphans and bad spans.

## What to know before touching the UI

- `[data-gantt-grid]` is the snapshot capture root: anything inside it ships in the exported
  image and the PDF, and anything conditionally unmounted disappears from them.
- Layers inside the body, back to front: grid → holidays → markers → bars → arrows → rollups
  → guides → legend.
- The sidebar and the timeline swap **grid track order and DOM child order together** in RTL.
- `dir="auto"` goes on leaves only. On a flex container it reverses main-axis order, and the
  bar root is a flex container whose children include the resize handles.

## Open threads

- **`ed9dfc1` is unpushed.** The work is committed now, but it exists on one disk only;
  `origin/main` is still at `c4e4054` and the branch has no remote counterpart. Pushing it is
  the only thing between this state and another total loss.
- **`e2e/features.spec.ts` and `gestures.spec.ts` are parked** (`describe.skip`) with a banner
  saying why: they need a `window.__ganttStore` test hook that was lost. Much of what they
  describe now exists, so they are worth reviving behind that hook.
- Five drag hooks still lack `pointercancel` handling; `useDragMove` is the one to copy from.
- 20 lint warnings remain, all `react-hooks` memoisation notes on the drag hooks. They are
  warnings by choice: this project does not run the React Compiler.

## Traps

- **pnpm is installed globally** (12.3.4). `pnpm build:exe` shells out to a bare `pnpm`.
- **`pnpm-workspace.yaml` needs `allowBuilds: {esbuild: true}`**, not `onlyBuiltDependencies`.
- **Playwright uses the system Chrome** via `channel: 'chrome'`; CI sets `PLAYWRIGHT_CHANNEL=''`
  to use the bundled browser instead.
- **`build:exe:web` rebuilds `dist/` with `--base=./`**, leaving it unusable for gh-pages.
  Re-run `pnpm build` afterwards.
- **`dist-single/index.html` must stay `-text` in `.gitattributes`.** The inlined bundle holds
  raw CR bytes; `core.autocrlf` would rewrite them and the file would differ from every build.
  Its bytes also depend on the checkout: `index.html` and `public/favicon.svg` are inlined
  verbatim, so rebuilding where those are LF yields a bundle 26 bytes smaller than the
  committed one. Rebuild only where `core.autocrlf=true` gave you CRLF copies of them.
- **Never clear `localStorage` from `page.addInitScript`** in an E2E spec: it re-runs on
  `page.reload()` and wipes the state a persistence test is checking. Playwright already gives
  each test a fresh context.
- **Fonts are base64-inlined in `src/fonts.css`.** Do not reintroduce a Google Fonts `@import`:
  the EXE's CSP blocks it and both offline builds cannot reach it.
