---
paths:
  - "src/hooks/**"
---

# Drag hook rules

Six hooks implement all direct manipulation: `useDragCreate`, `useDragMove`, `useDragResize`,
`useDragRowSpan`, `useDragConnect`, `useResizeSidebar`. **Each one hand-rolls its own pointer
plumbing.** There is no shared gesture abstraction — a `useDragGesture` was written once and
lost before it was committed (roadmap R-10). Until it is rebuilt, a seventh gesture means a
seventh copy, so prefer extending an existing hook. `useDragMove` is the one to copy from:
it is the only hook that handles `pointercancel` and reads live values without a
render-phase ref write.

## The pattern every hook repeats

```ts
const target = e.target as HTMLElement;
target.setPointerCapture(e.pointerId);
document.body.style.userSelect = 'none';

const handlePointerMove = (moveEvent: PointerEvent) => { /* threshold, then preview state */ };
const handlePointerUp = () => { /* restore body styles, null the handlers, commit once */ };

target.onpointermove = handlePointerMove;
target.onpointerup = handlePointerUp;
```

Note what this pattern does **not** do, because every hook inherits the same gaps:

- **No `pointercancel` or `lostpointercapture` handler, and no unmount teardown.** A gesture
  interrupted by a touch-pan takeover, a second contact, or the captured node unmounting
  strands a live `onpointermove` and leaves `document.body.style.cursor` / `userSelect`
  mutated for the rest of the session. This is roadmap R-10 and it is live.
- **Body styles are blanked (`= ''`), not saved and restored.** Anything else that set them
  loses its value.
- **`useResizeSidebar` has no `e.button !== 0` guard** — a right-click on the divider arms a
  resize whose pointerup never arrives.
- Handlers are assigned to `target.onpointermove`, so a second gesture on the same element
  silently replaces the first rather than stacking.

**Live feedback flows down as props**, not through the store: `moveOverride` /
`resizeOverride` / `rowSpanOverride` / `ghostBar` go `GanttChart` → `TimelineBody` →
`ActivityBar`, which recomputes geometry from the override. **Nothing is persisted
mid-gesture** — that is what keeps a drag to one undo entry. Preserve it.

## Rules

1. **One gesture, one commit.** zundo records a history entry per `set()` that changes the
   chart reference. Two compound actions on `chartSlice` exist for this — `moveActivity`
   (position + row) and `setActivityRowSpan` (span + row) — and every gesture that changes
   two things routes through one of them. Adding a gesture that calls two mutators costs two
   Ctrl+Z presses and passes through a state the user never saw; add a compound action
   instead.
2. **A missing-dependency warning is only benign when the missing name is a `*Ref`.**
   `pnpm lint`'s `react-hooks/exhaustive-deps` warnings were described for a long time as
   "memoisation notes, warnings by choice". Most were: a missing `rowsRef` or `monthWidthRef`
   is harmless because a ref is stable. But the same wording was covering a real defect —
   `useDragCreate` omitted `unitAt`, a function defined in the component body that closed over
   `isRtl`, and both callbacks using it were memoised on a stable dependency. They were built
   once and kept the direction from first render, so after switching to RTL a double-click
   created the bar at the mirrored column: measured at unit 3 instead of 32, drawn at x=2560
   instead of x=240, while the ghost preview (which reads `isRtl` during render) was correct.
   Triage each warning by what it names. A ref: benign. A value, or a function declared in the
   component body: a bug. Keep the set uniform — every warning that survives should name only
   refs, so the next dangerous one stands out instead of blending in.
3. **Never write a ref during render.** `someRef.current = value` in a component body is
   unsafe under StrictMode and concurrent rendering, and ESLint flags it. Use
   **`hooks/useLatest.ts`**, which syncs in an effect. `pnpm lint` is at zero errors — keep
   it there.
4. **Read live values through `useLatest`, not the closure.** `monthWidth`, `rowSize` and the
   row layout all change mid-drag, and the `useCallback` closure captures the values from the
   render that created it. The exception is a ref the gesture itself writes — `useDragConnect`'s
   `dragRef` holds the current snap target and is assigned **by the pointer handlers**, because
   an effect-synced ref lags by a commit and a flick whose last pointermove and pointerup land
   in the same frame would read a stale target and silently drop the dependency.
5. **Commit from what the preview last showed**, not by re-deriving from the pointerup
   event. `useDragCreate` runs the same `unitAt` for the ghost and the commit; when one
   floored and the other rounded, the created bar could sit a column from what the user saw.
6. **Clamp positional writes at BOTH ends** with `clampStartUnit`. A lower-bound-only clamp
   puts the overflow past the chart end in LTR — and off the LEFT edge in RTL, outside the
   scroll container's reach.
7. **Every index→pixel conversion goes through `utils/timeline.ts`.** `unitSpanToLeft`,
   `xToUnit`, `deltaToUnits`, `dateToUnitOffset`. RTL is arithmetic mirroring; a hook that
   does its own `clientX / width` maths is correct in LTR and silently wrong in RTL.
   `useDragResize` additionally goes through `visualEdgeToTemporalEdge`, because in RTL the
   visually-left edge controls the temporal END.
8. **Thresholds belong in `src/constants/timeline.ts`.** `EDGE_THRESHOLD` (12px, left/right
   resize), `ROW_SPAN_EDGE_THRESHOLD` (6px, top/bottom) and `DOUBLE_TAP_*` live there.
   `DRAG_THRESHOLD` is still a module-local `4` in three hooks, `20` in `useDragCreate`, and
   `SNAP_DISTANCE` is `20` inside `useDragConnect` — move them when you next touch those.
   The two edge thresholds differ deliberately: a bar is only `rowHeight - 8` tall, so a 12px
   zone at each end left just 8px that started a move and made dragging a bar to another row
   nearly impossible.
9. **Anything draggable by pointer needs `touch-action: none`** in `index.css`, otherwise
   `[data-gantt-scroll]` swallows the gesture on touch devices.

## Coordinate conversions

The origin is `[data-timeline-body]`'s measured bounding rect — never `sidebarWidth -
scrollLeft`, which is simply wrong once the sidebar moves to the other side in RTL. Measuring
is correct in both directions with no branch.

`getActivityRect` in `utils/dependencyRouting.ts` is the single description of an activity's
box, and a milestone is a one-unit bar so **one** computation covers both shapes. Keep it that
way: when routing modelled a milestone as a `round(rowHeight * 0.55)` square while the
component drew a full unit-wide box — 22px against 76px at default zoom — arrows terminated
well inside the shape and the 20px snap radius probed where the anchor dot was not.
`src/test/activity-rect.test.ts` asserts the two agree.

## Keyboard and undo

`useKeyboardShortcuts` binds one `window` keydown listener. It guards `INPUT` / `TEXTAREA` /
`contentEditable`, and additionally bails while a Radix overlay is open (`isOverlayOpen`) —
those portals render outside the app tree and do not stop propagation, so without it Delete
removed the selection sitting behind an open modal. Keys are compared case-insensitively with
an explicit `e.shiftKey` branch; matching `'z'` and `'Z'` instead inverts undo and redo under
Caps Lock.

`useUndo` / `useRedo` are memoised — an unmemoised closure re-binds the listener on every
render — and both funnel through `dropDanglingSelection()` in `stores/hooks.ts`. Selection is
outside `partialize`, so an undo that removes an activity would otherwise leave
`selectedActivity` / `editingActivity` pointing at an id that no longer exists. That one
choke point is cheaper than a store-wide subscription firing on every drag commit. Use
`useCanUndo` / `useCanRedo` for anything that needs to know whether history is exhausted.

## Accessibility floor

Activity bars, milestones, anchor dots, sidebar rows and the sidebar resize handle are all
bare `<div>`s with no `tabIndex`, `role` or `aria-*`, and there is no keyboard path to
select, move, resize, rename, connect or delete anything. New interactive affordances should
not extend that: give them a role, an accessible name, and a key binding.
