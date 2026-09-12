# Week dates · Hebrew RTL · add-row bug — design

Three changes landing in one pass. They collide in `GanttChart.tsx` (all three rewrite the
same layout block) and in the `ViewSettings` pipeline (two new flags through the same seven
sites), so the order below is load-bearing, not stylistic.

## 1. Week-date labels

**Want:** in weeks mode, each column shows its calendar date under the week number.

`buildWeekHeaders` already computes `addDays(chartStart, i * 7)` and throws it away after
taking the ISO week number. It returns a **pre-formatted string**, not a `Date` — the rule
in `.claude/rules/timeline-math.md` is that no `Date` reaches the render path, and a string
keeps the format unit-testable and cheap across ~1000 cells.

Format is `dd.MM`, not `toLocaleDateString`: locale-dependent width would make the
degradation threshold unpredictable *and* make the exported JPEG differ between machines.
`dd.MM` is already the app's own convention in snapshot filenames.

The week tier grows from 28px to 40px when dates are on. That breaks the `TIER_HEIGHT ×
tierCount` idiom used in **two** files, so both now consume one helper:

```ts
getHeaderTierHeights(mode, showQuarters, showWeekDates)  // named object, not an array
getHeaderHeight(...)                                     // the sum
```

A named object, because `noUncheckedIndexedAccess` types `tiers[0]` as `number | undefined`,
and `style={{ height: undefined }}` compiles clean and silently renders an unsized tier —
exactly the drift the helper exists to prevent.

**Tier height depends on the toggle only, never on `unitWidth`.** `effectiveUnitWidth` comes
from a `ResizeObserver`; if the tier shrank when the date no longer fit, the whole chart
would reflow mid-window-drag. When the toggle is on but the column is too narrow, the line
is reserved and left empty.

Toggle lives in the toolbar slot the months-only `Qr` button leaves empty in weeks mode —
zero net toolbar growth. Default **on**, since it is the requested feature.

## 2. Hebrew / RTL

Two independent parts.

**Part A — always on, no setting.** `dir="auto"` on every element rendering *user-entered*
text. The Unicode first-strong heuristic then handles Hebrew, English and mixed strings with
no mode switch, and fixes what actually breaks: trailing punctuation, parentheses, the side
the `truncate` ellipsis lands on, and caret behaviour in inputs.

**Scoping rule: leaves only.** Never on `[data-activity-bar]` or any positioned container.
`direction` does not move physical `left`/`right` CSS, but it *does* reverse flex main-axis
order, and the bar root is a flex container.

Accepted limitation: `"Phase 1 - שלב א"` classifies LTR and `"2026 תכנון"` classifies RTL,
because digits are bidi-neutral. That is correct first-strong behaviour; a per-string
direction field is not worth the data-model cost.

**Part B — `ViewSettings.columnDirection: 'ltr' | 'rtl'`.** Mirrors the row-name column to
the right and right-aligns it.

Implemented by **swapping the grid track order and the DOM child order**, with `dir="rtl"`
scoped to the Sidebar root only. Explicitly *not* `direction: rtl` on the grid container:
that inherits into the whole timeline and inverts the scroll origin (`scrollLeft` becomes 0
at the right edge and runs negative), which would break drag-create silently.

Also not `gridColumn` on the children: with `grid-auto-flow: row`, sparse auto-placement
never moves the cursor backwards, so a child at column 2 followed by one at column 1 spills
into a new row and the computed heights land on the wrong tracks.

While here, `TimelineBody`'s drag-create origin changes from `sidebarWidth - scrollLeft` to
a bounding-rect read of `[data-timeline-body]`. That arithmetic is already wrong today — it
assumes the scroll container starts at viewport x=0 — and every other hook already reads the
rect. One change makes it RTL-correct and deletes a latent bug.

**The time axis does not mirror. January stays on the left.** This is the key judgement, so:

- The request was "the column rtl". Not the axis.
- DHTMLX Gantt — the most-used RTL Gantt — treats column side and axis direction as separate
  knobs; AG Charts does not mirror axes in RTL at all. There is no standard requiring it, and
  W3C's mirroring guidance explicitly carves out things that shouldn't mirror.
- Hebrew readers read Gregorian dates and Arabic numerals LTR anyway, so a mirrored header
  would run Jan→Mar right-to-left while each cell's own "2026" reads left-to-right.
- The deliverable is a JPEG pasted into decks full of LTR Excel and Project charts.
- **Decisive:** `Dependency.fromSide`/`toSide` persist the literals `'left'`/`'right'` into
  every saved file. If "left" meant "earlier" in one mode and "later" in another, the same
  JSON would render differently per view flag and files would stop being portable. Mirroring
  needs an anchor-vocabulary migration to start/end first.

If it is ever genuinely wanted, the shape is a *separate* `timeDirection` flag, preceded by
introducing a single `unitToX`/`xToUnit` pair everything routes through.

**Two Hebrew bugs neither part covers, both fixed here:**

1. `buildExportFileName` and the snapshot filename both do `replace(/[^a-z0-9]/gi, '-')`, so
   a Hebrew chart name collapses to a single `-`. Every Hebrew chart exports to the same
   filename. Fixed with `/[^\p{L}\p{N}]+/gu` and a non-empty fallback.
2. DM Sans has no Hebrew glyphs, so `"Design שלב א"` paints two typefaces at two x-heights on
   one 11px line. Fixed by naming a Hebrew face in `--font-sans`.

## 3. Add-row double-click bug

**Confirmed root cause.** Double-clicking the sidebar adds a row, but the handler early-returns
inside `[data-sidebar-row]`, so it only fires in the empty band *below* the last row. That band
is `bodyHeight - totalHeight` where `bodyHeight = Math.max(totalHeight, 300)` — so it shrinks
to exactly zero once rows fill 300px:

| Row size | Band hits zero at | Reported |
|---|---|---|
| small (28px) | 11 rows | |
| medium (40px) | 8 rows | ✔ "6 or 7" |
| large (56px) | 6 rows | ✔ |

**Fix:** `getBodyHeight(totalHeight, rowHeight) = max(totalHeight + rowHeight, 300)` — one
row's worth of band, always. The band is no longer invisible: the ghost row already drawn by
`TimelineGrid` becomes the visual continuation, and the sidebar half gets a real
`<button>` so it is keyboard-reachable and screen-reader-announced rather than a
pointer-only gesture.

Rejected: deriving the minimum from observed container height. That closes a feedback loop
with the taller header — header grows → vertical scrollbar → `clientWidth` shrinks →
`effectiveUnitWidth` changes → the week-date ladder flips → re-render. `MIN_BODY_HEIGHT`
stays a plain constant.

Also fixed here: the sidebar handler has no `e.button !== 0` guard, so right-click then
left-click in the band adds a row.

`HelpDialog` already documents the gesture ("Double-tap on an empty area below the last
sidebar row") — that sentence gets updated, not duplicated.

## Implementation order

Forced by the collisions, not by preference:

1. **Shared plumbing**, no user-visible change: the three new constants, the layout helpers,
   and *both* `ViewSettings` flags through all seven sites in one pass. Doing the two flags
   as separate passes would have the second clobber the first — `globalFontSize` was lost
   exactly that way.
2. **Bug fix.** Smallest blast radius, no persisted state, and it is the actual bug — so it
   lands even if the rest slips.
3. **Week dates.** Consumes the step-1 header helper.
4. **RTL Part A** + the two Hebrew bugs. Purely additive attributes; do it before Part B so
   RTL is tested against correct bidi rather than debugging both at once.
5. **RTL Part B.** Last, unconditionally — it is the only change that can invert a
   coordinate, so it must apply to already-verified geometry.
6. **`snapshot.ts` once**, after the image height has stopped moving.

## Testing

Unit-testable: the date formatter, `getHeaderTierHeights`/`getHeaderHeight`,
`getBodyHeight` (including a regression guard asserting the *old* formula gave a zero band at
6/8/11 rows and the new one does not), and the filename sanitiser against Hebrew input.

Not unit-testable: jsdom does no bidi layout and no font fallback, so every RTL visual claim
is verified in a real browser.
