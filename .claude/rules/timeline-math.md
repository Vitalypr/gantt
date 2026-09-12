---
paths:
  - "src/utils/timeline.ts"
  - "src/constants/timeline.ts"
  - "src/components/Timeline/**"
  - "src/components/GanttChart/**"
---

# Timeline and coordinate rules

## The coordinate system

Everything is `unitIndex * effectiveUnitWidth`. A unit is a month in months mode and a week
in weeks mode. **No `Date` objects in the render path** — dates only appear in
`src/utils/timeline.ts` while building headers and boundary sets.

`GanttChart.tsx` owns layout:

1. A `ResizeObserver` on `[data-gantt-scroll]` gives `containerWidth`.
2. `effectiveUnitWidth = Math.max(monthWidth, (containerWidth - sidebarWidth) / totalUnits)`.
3. That value is written back to the store (`setEffectiveMonthWidth` / `setEffectiveWeekWidth`)
   so drag hooks snap against the width that is actually rendered.
4. `rowLayout` accumulates `ROW_SIZE_MAP[rowSize]` over rows sorted by `order`, producing
   `{rowId, activityIds, y}` records consumed by Sidebar, TimelineBody and DependencyLayer.

Know before touching zoom: the auto-fit floor in step 2 **overrides `MAX_MONTH_WIDTH`**, and
because `fitWidth` is by construction ≥ any width fit-to-view would compute, the fit-to-view
button cannot change what is displayed. The zoom buttons also disable against the raw
`monthWidth` while the readout shows the effective width, so the two can disagree for many
clicks. Decide which one owns the width before changing either.

Scroll sync is pure CSS `position: sticky` inside one scroll container. There is no JS
scroll listener and no virtualisation — every unit column and every row renders.

## Date arithmetic

**Never write `(a.getTime() - b.getTime()) / 86400000`.** Across a DST transition the
quotient is fractional (90.9583 instead of 91) and the surrounding `Math.floor(x / 7)` lands
a week early, which shifts month/year boundary grid lines and corrupts ISO week labels for
the rest of the chart. Likewise `new Date(t + i * 7 * 86400000)` lands at 23:00 of the
previous day.

Use the local-midnight-safe helpers in `src/utils/timeline.ts` (`daysBetween`, `addDays`)
for every day/week computation, in this file and in `chartSlice.setDateRange`.

## Weeks mode is not ISO weeks

Weeks are fixed 7-day buckets anchored to the **1st of the chart's start month**, whatever
weekday that is. They are *labelled* with ISO week numbers, which is a display convention,
not the bucketing rule. Do not "fix" the labels by re-anchoring the buckets — that would
silently move every existing activity.

Two invariants the header must satisfy, and which are worth asserting in a test:

- `sum(monthHeaders.spanWeeks) === getTotalWeeks(...)` — otherwise the flex row rescales
  every cell and no month aligns with the week column beneath it.
- Each month header's `startWeek` must be its *actual* week index, not a running accumulator.
  A week straddling two months belongs to exactly one header.

## Header and body heights

Both come from pure helpers in `utils/timeline.ts`; do not re-derive either inline.

- `getHeaderTierHeights(mode, showQuarters, showWeekDates)` returns a **named object**
  (`{top, middle?, unit}`), not an array — under `noUncheckedIndexedAccess` an indexed read
  types as `number | undefined`, and `style={{ height: undefined }}` compiles clean while
  silently rendering an unsized tier.
- `getHeaderHeight(...)` is that object summed. `GanttChart` uses the sum for the grid track;
  `TimelineHeader` styles each tier from the object. That is what keeps the two files from
  disagreeing.
- **Tier heights depend on the toggles only, never on unit width.** Unit width comes from a
  `ResizeObserver`, so a width-dependent tier height reflows the whole chart mid-drag.
- `getBodyHeight(totalRowsHeight, rowHeight)` always leaves one row of empty band below the
  content. That band is the add-row target; a flat `max(total, 300)` floor made it shrink to
  zero once rows filled 300px, which is how double-click-to-add-row broke past ~7 rows.
  Row height is a fine input here — it changes on a discrete button press, not continuously.

Do not derive a minimum body height from observed container height: it closes a loop with
the header (taller header → scrollbar → narrower `clientWidth` → new `effectiveUnitWidth` →
re-render).

Labels degrade by available width (full label → abbreviated → number → blank). Keep that
ladder when adding a tier; a tier that overflows silently is worse than a blank one.

## Grid

`TimelineGrid` draws `totalUnits + 1` vertical SVG lines plus one horizontal line per row.
Boundary emphasis comes from `getMonthBoundaryWeeks` / `getYearBoundaryWeeks` in weeks mode
and from an offset-to-January modulus in months mode. Vertical lines stop at the last row by
design; the band below is deliberately empty canvas.

## Clamping

Positions are clamped at 0 on the left. There is no right-hand clamp: the grid track is a
fixed-width column, so an activity committed past `totalUnits` sits outside the sized area
and the scroll container will not reach it. Any new positional write needs both bounds.
