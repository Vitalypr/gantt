---
paths:
  - "src/components/**"
  - "src/index.css"
  - "src/constants/colors.ts"
  - "src/utils/color.ts"
---

# UI component and styling rules

## Tokens

All design tokens live in the `@theme` block of `src/index.css`, each with a matching `.dark`
override at the top of the same file. `@theme` (Tailwind v4) both declares the custom property
*and* generates utilities — `--color-surface` gives you `bg-surface`. Plain `:root` custom
properties do not.

What exists today: the shadcn-style semantic colors (`background`, `foreground`, `muted`,
`border`, `border-subtle`, `ring`, `primary`, `secondary`, `destructive`, `accent`, `popover`,
`card`, `surface`), the chart-specific ones (`grid-line`, `grid-line-strong`, `dep-arrow`,
`dep-arrow-selected`, `dep-ghost`, `anchor-dot-bg`, `anchor-dot-border`), three radii, three
bar shadows, and `--font-sans`.

**Never hardcode a hex in a component.** Current offenders, all dark-mode bugs: the label
color in `ActivityBar` / `MilestoneMarker` (`#ffffff` / `#0f172a`), the capture background in
`snapshot.ts` (`#ffffff`), the scrollbar thumbs and `.ghost-bar` gradient in `index.css`. If
the token you need does not exist, add it to both the `@theme` block and the `.dark` block
rather than inventing a one-off.

**There is no type scale.** Components use arbitrary sizes — `text-[9px]`, `text-[10px]`,
`text-[11px]`, `text-[13px]` — chosen per site. A `--text-*` scale was built and lost
(roadmap R-23). Until it is rebuilt, match the size of the nearest equivalent control rather
than picking a new value.

## Activity geometry

Geometry is computed in **two places that disagree**, and that is a live defect:

- `ActivityBar` draws `left = startMonth * monthWidth`, `width = max(duration * monthWidth,
  monthWidth * 0.5)`, `height = calc(rowSpan * 100% - 8px)`, `top = 4px`.
- `getActivityRect` in `utils/dependencyRouting.ts` restates the same arithmetic, and for a
  milestone models a `round(rowHeight * 0.55)` square while `MilestoneMarker` draws
  `max(monthWidth - 4, height)`. At default zoom that is 22px against 76px, so arrows
  terminate well inside the shape and the 20px snap test in `useDragConnect` probes where the
  anchor dot is not (roadmap R-21).

Do not add a third site. When you touch either, prefer collapsing them onto one function over
patching one of them.

`ActivityBar` and `MilestoneMarker` are separate components with separately-written context
menus, so an action added to one silently does not exist on the other. Check both.

## Layering

There is no declared z scale (roadmap R-22). What exists in practice:

```
grid SVG           (absolute, no z)   TimelineGrid
resize handles     z-2                index.css
anchor dots        z-5                index.css
spanning-bar row   zIndex: 1          TimelineBody, set on the row container
sidebar            z-10               GanttChart
timeline header    z-20               GanttChart
top-left corner    z-30               GanttChart
Radix portals      —                  rendered outside the grid entirely
```

The `zIndex: 1` that `TimelineBody` puts on any row containing a spanning bar creates a
stacking context that traps everything inside it — lift the element, not its container.

## Color on colored bars

`isColorDark` in `src/utils/color.ts` currently uses a **non-gamma YIQ formula**
(`0.299r + 0.587g + 0.114b`, threshold 0.6). It misclassifies saturated mid-tones: white text
lands at roughly 2.3–2.8:1 on the orange, green, teal and cyan swatches in
`ACTIVITY_COLOR_GROUPS` — below the 3:1 floor for *any* text size, when flipping to dark text
would score 6.4–7.8:1. The WCAG relative-luminance replacement was written and lost (roadmap
R-08). Do not build new contrast logic on the current helper; fix the helper.

Targets: 4.5:1 for normal text, 3:1 for ≥18.66px bold or ≥24px text (WCAG 1.4.3) and for
non-text UI boundaries such as bar edges and focus rings (1.4.11).

## Density and depth

- `--shadow-bar` is defined in both themes and **applied nowhere**. Bars sit perfectly flat at
  rest and then jump to a 12px-blur `--shadow-bar-hover` (roadmap R-26). A resting elevation
  is what makes a light-shade bar read as an object against the surface.
- In dark mode, elevation should be a rim light, not a black drop shadow — the current
  `.dark --shadow-bar*` values are black on near-black and therefore invisible.
- The grid has three intended tiers but renders as two: the stroke-color ternary in
  `TimelineGrid` returns `--color-grid-line-strong` for **both** the extra-strong and strong
  branches, leaving `strokeWidth` (1.5 / 1 / 0.5) as the only differentiator (roadmap R-25).
- The vertical grid lines stop at `bottomY`, the bottom of the last row, so the rest of the
  canvas is a blank untextured plane (roadmap R-25b).

## Accessibility floor for new UI

None of this is in place today; do not make it worse.

- Every icon-only button needs an `aria-label`. `Toolbar.tsx` has **zero** — a Radix tooltip
  supplies `aria-describedby` while open, which does not *name* the button, so a screen reader
  announces "button" sixteen times (roadmap R-13). The tooltip strings already exist.
- Every toggle needs `aria-pressed` (Mo/Wk, Connect, Qr).
- Never write `outline-none` without a replacement. There is **no** `:focus-visible` rule in
  `index.css`, and the eight date controls, the Mo/Wk toggle, the color swatches and the
  inline rename input all set `outline-none` — tabbing produces no feedback at all
  (roadmap R-12, a WCAG 2.4.7 failure).
- Wrap anything that animates on a loop in `@media (prefers-reduced-motion: reduce)`. There is
  no such guard, and `.today-dot` pulses infinitely (roadmap R-12b).

## Fonts

`index.css` line 1 `@import`s DM Sans from Google Fonts. **The EXE's own CSP blocks it and
both offline builds cannot reach it**, so those builds silently fall back to
`ui-sans-serif` (roadmap R-37). Self-host a woff2 before relying on the typeface for anything
load-bearing.

## Render cost

`TimelineBody` re-renders on every pointermove during a drag, because drag state lives in
`GanttChart`'s local state. Inside that hot path it currently runs
`activityIds.map(id => allActivities.find(...))` per row — O(n²) per frame (roadmap R-30).
Resolve through a memoised `Map` instead, and keep the bar components memoisable.

Do not add unselectored `useStore.subscribe` calls; they run on every store write, including
every drag commit. `App.tsx`'s easter-egg subscription is one and is the reason to not add a
second.

## Exported image

`snapshotGantt()` rasterises the live DOM of `[data-gantt-grid]`. Two consequences:

1. Anything rendered inside that element **ships in the exported image** — and anything
   conditionally unmounted silently disappears from it. `DependencyLayer` is mounted only
   while connect mode is on, so **every arrow the user drew is missing from the JPEG**
   (roadmap R-05). The layer is `pointer-events-none`, so mounting it unconditionally is
   behaviourally safe; only the anchor dots need to stay gated.
2. The capture background is hardcoded `#ffffff`, so a dark-mode export comes out as light
   text on white (roadmap R-28a).
