# Handoff

_Updated 2026-09-12 · branch `main` · deployed to gh-pages_

## State

All gates green: `tsc -b` 0 · `pnpm lint` **0 errors** (20 warnings) · `pnpm test` **201
passing** · `pnpm test:e2e` **47 passing** (30 parked) · `pnpm build` and `pnpm build:single`
both succeed, all re-run on the dev box at `0fc653c`. The E2E figure is from `ed9dfc1`,
verified on a clean Linux checkout and not re-run since.

`main` is the only source branch — `gh-pages` holds built output and nothing else. The live
site at https://vitalypr.github.io/gantt/ serves `0fc653c`; a `gh-pages` push is not the same
as a live site, because GitHub runs a build in between that takes ~20s.

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
- **Row pitch is NOT uniform any more.** A topic gap (`TOPIC_GAP`) sits between topic blocks,
  so `Math.round(dy / rowHeight)` no longer finds the row under the pointer. `rowIndexAtY` in
  `utils/layout.ts` hit-tests the rendered bands instead, and `useDragMove` / `useDragRowSpan`
  both go through it. Any new code that turns a y into a row must do the same.
- **`Activity.status` is drawn as a rail, and the rail's height is a contract.** The rail is
  absolutely positioned inside the bar's bottom edge, so the only height it costs the label is
  `STATUS_RAIL_RESERVE`, added as the bar's `paddingBottom` and only while a rail is drawn. The
  label box is `self-stretch overflow-hidden`, so it IS that padded box and clips there — which
  is what makes "text never reaches the rail" structural rather than a sum that happens to work
  at the default font size. `src/test/activity-status.test.ts` asserts both, including the case
  that fails without the reserve.
- **`utils/layout.ts` owns the width arithmetic the sidebar drag and fit-to-view share.**
  `fitUnitWidth` divides the space beside the sidebar by the unit count; `sidebarWidthFromDrag`
  turns a pointer delta into a width. Both are RTL-aware by construction and unit-tested —
  the drag used to take `clientX` as the width outright, which is only true when the sidebar
  starts at viewport x=0 and so clamped every RTL drag to the maximum on the first move.
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

- **`e2e/features.spec.ts` and `gestures.spec.ts` are parked** (`describe.skip`) with a banner
  saying why: they need a `window.__ganttStore` test hook that was lost. Much of what they
  describe now exists, so they are worth reviving behind that hook.
- Four drag hooks still lack `pointercancel` handling; `useDragMove` is the one to copy from,
  and `useResizeSidebar` now handles it too.
- 19 lint warnings remain, and the set is now uniform on purpose: **every one names a `*Ref`**,
  which is stable, so omitting it is genuinely harmless. That uniformity is the point. The set
  used to be described as "memoisation notes, warnings by choice", and a real defect was hiding
  inside it — `useDragCreate` omitted `unitAt`, a body-level function closing over `isRtl`, so
  after switching to RTL a double-click created the bar at the mirrored column. Triage each new
  warning by what it names: a ref is benign, a value or a body-level function is a bug.

## Traps

- **pnpm is installed globally** (12.3.4). `pnpm build:exe` shells out to a bare `pnpm`.
- **`pnpm-workspace.yaml` needs `allowBuilds: {esbuild: true}`**, not `onlyBuiltDependencies`.
- **Playwright uses the system Chrome** via `channel: 'chrome'`; CI sets `PLAYWRIGHT_CHANNEL=''`
  to use the bundled browser instead.
- **A deploy is invisible on the first page-view.** The app is a PWA: the service worker
  precaches the shell, so after `pnpm deploy:gh` the next visit is served the PREVIOUS build and
  only the one after that gets the new one. Measured: the live site handed this browser
  `index-Bt70_8CW.js` — a build from hours earlier — while `index.html` and `sw.js` on the
  server both referenced the current bundle. `main.tsx` now reloads once on `controllerchange`
  so the handover happens on the same visit. When checking a deploy by hand, load it twice, or
  compare the bundle hash the page actually loaded against `curl -s <site> | grep index-`.
- **`build:exe:web` rebuilds `dist/` with `--base=./`**, leaving it unusable for gh-pages.
  Re-run `pnpm build` afterwards.
- **Tailwind's sources are declared in `src/index.css`, not auto-detected. Leave them that
  way.** v4's automatic detection scans the whole project minus `.gitignore`, and two paths
  here are deliberately not ignored: `dist-single/index.html` is a tracked artifact, so each
  build scanned the *previous* build's output and re-emitted every class it had ever held;
  and `docs/*.md` is prose, so a handoff note that merely NAMED a utility class generated it
  — this file did exactly that and resurrected a dead rule. The bundle became a ratchet that
  never dropped a rule and never built twice the same. `source(none)` plus explicit `@source`
  fixed it: the build is now idempotent and the CSS is 11 KB smaller. If the bundle starts
  growing for no reason, check what got added to the scan.
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
