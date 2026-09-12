import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { clampStartUnit, deltaToUnits } from '@/utils/timeline';
import { totalUnits as totalUnitsOf } from '@/stores/selectors';
import { rowIndexAtY, timelineBodyTop } from '@/utils/layout';
import { useLatest } from '@/hooks/useLatest';

const DRAG_THRESHOLD = 4; // px minimum movement before drag starts

export type DragMoveState = {
  activityId: string;
  originalStartMonth: number;
  currentStartMonth: number;
  /** Rows moved relative to the bar's own row; drives the preview offset. */
  rowOffset: number;
  /** Unit positions where this bar's edges line up with another bar's edge. */
  guides: number[];
} | null;

/**
 * Horizontal drag moves the bar in time; vertical drag moves it between rows.
 *
 * Live values (unit width, row height, row order) are read from `useStore.getState()` inside
 * the handlers rather than captured in the `useCallback` closure or mirrored into a ref
 * written during render — both of which go stale mid-drag, and the latter is the
 * `react-hooks/refs` violation tracked as R-LINT.
 */
export function useDragMove(rows: { rowId: string; y: number }[]) {
  const moveActivity = useStore((s) => s.moveActivity);
  const [dragState, setDragState] = useState<DragMoveState>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const latestRef = useRef<DragMoveState>(null);
  // The rendered bands, which is what the pointer is actually over. Read live: a row added or
  // a group collapsed mid-drag would otherwise leave this pointing at the old layout.
  const rowsRef = useLatest(rows);

  const apply = (next: DragMoveState) => {
    latestRef.current = next;
    setDragState(next);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent, activityId: string, currentStartMonth: number) => {
      e.stopPropagation();
      startXRef.current = e.clientX;
      startYRef.current = e.clientY;
      isDraggingRef.current = false;

      // Row order is fixed for the duration of a drag, so resolve it once here.
      const bodyTop = timelineBodyTop();
      const chart = useStore.getState()._activeChart();
      const orderedRowIds = [...chart.rows]
        .sort((a, b) => a.order - b.order)
        .map((r) => r.id);
      const fromRowIndex = orderedRowIds.findIndex((id) =>
        chart.rows.find((r) => r.id === id)?.activityIds.includes(activityId),
      );

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';

      const geometry = () => {
        const s = useStore.getState();
        return {
          unitWidth: s.timelineMode === 'weeks' ? s.effectiveWeekWidth : s.effectiveMonthWidth,
          rowHeight: ROW_SIZE_MAP[s.rowSize],
          isRtl: s.chartDirection === 'rtl',
          totalUnits: totalUnitsOf(s),
        };
      };

      const span = Math.max(1, useStore.getState()._activeChart()
        .activities.find((a) => a.id === activityId)?.durationMonths ?? 1);

      // Every other bar's start and end, as unit positions. Snapshotted at pointerdown: the
      // set cannot change mid-drag, and recomputing it per pointermove would be O(n) a frame.
      const otherEdges = (() => {
        const edges = new Set<number>();
        for (const a of useStore.getState()._activeChart().activities) {
          if (a.id === activityId) continue;
          edges.add(a.startMonth);
          edges.add(a.startMonth + (a.isMilestone ? 1 : a.durationMonths));
        }
        return edges;
      })();

      const resolve = (clientX: number, clientY: number) => {
        const { unitWidth, rowHeight, isRtl, totalUnits } = geometry();
        // Dragging right moves a bar EARLIER in RTL, and the clamp needs BOTH bounds: a
        // lower-bound-only clamp pushes the overflow off the LEFT edge in RTL, outside the
        // scroll container's reach.
        const startMonth = clampStartUnit(
          currentStartMonth + deltaToUnits(clientX - startXRef.current, unitWidth, isRtl),
          span,
          totalUnits,
        );
        let rowOffset = 0;
        if (fromRowIndex >= 0) {
          // Hit-test the rendered bands rather than dividing by a pitch. Topic gaps make the
          // pitch non-uniform, and `Math.round(dy / rowHeight)` is then wrong by a growing
          // amount for every gap crossed. Hit-testing is also what makes a collapsed group
          // behave: the visible rows are the ones the pointer can actually be over.
          const bands = rowsRef.current;
          const hit = rowIndexAtY(bands, rowHeight, clientY - bodyTop);
          const targetRowId = hit >= 0 ? bands[hit]?.rowId : undefined;
          const targetOrdered = targetRowId ? orderedRowIds.indexOf(targetRowId) : -1;
          const wanted = targetOrdered >= 0
            ? targetOrdered - fromRowIndex
            : Math.round((clientY - startYRef.current) / rowHeight);
          rowOffset = Math.max(
            -fromRowIndex,
            Math.min(orderedRowIds.length - 1 - fromRowIndex, wanted),
          );
        }
        // Guides are feedback, not constraint: positions are already integers, so alignment
        // happens by construction - what was missing was any sign that it had.
        const end = startMonth + span;
        const guides: number[] = [];
        if (otherEdges.has(startMonth)) guides.push(startMonth);
        if (otherEdges.has(end)) guides.push(end);

        return { startMonth, rowOffset, guides };
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startXRef.current;
        const dy = moveEvent.clientY - startYRef.current;

        if (!isDraggingRef.current) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          document.body.style.cursor = 'grabbing';
        }

        const { startMonth, rowOffset, guides } = resolve(moveEvent.clientX, moveEvent.clientY);
        apply({
          activityId,
          originalStartMonth: currentStartMonth,
          currentStartMonth: startMonth,
          rowOffset,
          guides,
        });
      };

      const finish = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        target.onpointermove = null;
        target.onpointerup = null;
        target.onpointercancel = null;

        const preview = latestRef.current;
        // Commit what the preview last showed, so the result matches what the user saw.
        if (isDraggingRef.current && preview) {
          const movedRow = preview.rowOffset !== 0;
          const movedTime = preview.currentStartMonth !== preview.originalStartMonth;
          if (movedRow || movedTime) {
            const toRowId = movedRow ? orderedRowIds[fromRowIndex + preview.rowOffset] : undefined;
            moveActivity(activityId, preview.currentStartMonth, toRowId);
          }
        }

        apply(null);
        isDraggingRef.current = false;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = finish;
      target.onpointercancel = finish;
    },
    [moveActivity],
  );

  return { onPointerDown, dragState };
}
