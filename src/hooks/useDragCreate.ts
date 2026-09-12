import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { DEFAULT_ACTIVITY_COLOR } from '@/constants/colors';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { clampStartUnit, unitSpanToLeft, xToUnit } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';
import { useLatest } from '@/hooks/useLatest';

const DRAG_THRESHOLD = 20;

/**
 * Pointer x to a unit index, clamped into the chart.
 *
 * Module scope on purpose. As a function defined in the component body it closed over
 * `isRtl`, and both callbacks that used it are memoised on a stable dependency — so they
 * captured it once and kept the direction from first render for the life of the session.
 * Taking `isRtl` as an argument makes that impossible to express.
 */
function unitAtX(
  clientX: number,
  timelineLeftOffset: number,
  unitWidth: number,
  totalUnits: number,
  isRtl: boolean,
): number {
  return clampStartUnit(
    xToUnit(clientX - timelineLeftOffset, unitWidth, totalUnits, isRtl),
    1,
    totalUnits,
  );
}

type DragCreateState = {
  rowId: string;
  startMonth: number;
  currentMonth: number;
  monthWidth: number;
  totalUnits: number;
} | null;

export function useDragCreate() {
  const addActivity = useStore((s) => s.addActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);
  const [dragState, setDragState] = useState<DragCreateState>(null);

  const { isRtl } = useChartDirection();
  // Read through a ref, not the closure. Both create callbacks are memoised on
  // `[createActivity]`, which is stable, so they are built ONCE — and a closed-over `isRtl`
  // stayed at whatever it was on first render. Toggling to RTL then left every created bar
  // mirrored, while the ghost preview (which reads `isRtl` during render) drew it correctly:
  // the bar landed nowhere near where the preview had been.
  const isRtlRef = useLatest(isRtl);
  const checkDoubleTap = useDoubleTap();
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const createActivity = useCallback(
    (startMonth: number, durationMonths: number, rowId: string) => {
      const activityId = addActivity(
        {
          name: 'New Activity',
          color: DEFAULT_ACTIVITY_COLOR,
          startMonth,
          durationMonths,
        },
        rowId,
      );
      setEditingActivity({ activityId });
    },
    [addActivity, setEditingActivity],
  );

  /**
   * Mouse double-click to create a one-unit activity.
   *
   * `checkDoubleTap` deliberately ignores a mouse (it would double-fire alongside the
   * browser's own dblclick), so the mouse path has to be wired explicitly.
   */
  const onDoubleClick = useCallback(
    (e: React.MouseEvent, rowId: string, timelineLeftOffset: number, monthWidth: number, totalUnits: number) => {
      createActivity(unitAtX(e.clientX, timelineLeftOffset, monthWidth, totalUnits, isRtlRef.current), 1, rowId);
    },
    [createActivity],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent, rowId: string, timelineLeftOffset: number, monthWidth: number, totalUnits: number) => {
      if (e.button !== 0) return;

      const startMonth = unitAtX(e.clientX, timelineLeftOffset, monthWidth, totalUnits, isRtlRef.current);

      // Touch/pen double-tap (key = rowId so taps on different rows don't pair)
      if (checkDoubleTap(e, rowId)) {
        createActivity(startMonth, 1, rowId);
        return;
      }

      startXRef.current = e.clientX;
      isDraggingRef.current = false;

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;

        if (!isDraggingRef.current) {
          if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
        }

        const currentMonth = unitAtX(moveEvent.clientX, timelineLeftOffset, monthWidth, totalUnits, isRtlRef.current);
        setDragState({ rowId, startMonth, currentMonth, monthWidth, totalUnits });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        document.body.style.userSelect = '';
        target.onpointermove = null;
        target.onpointerup = null;

        if (isDraggingRef.current) {
          // The SAME `unitAt` the preview used. When the ghost floored and the commit
          // rounded, the created bar could sit one column away from what the user saw.
          const endMonth = unitAtX(upEvent.clientX, timelineLeftOffset, monthWidth, totalUnits, isRtlRef.current);
          const s = Math.min(startMonth, endMonth);
          const e2 = Math.max(startMonth, endMonth);
          // Inclusive of both end columns: dragging across one column creates a 1-unit bar.
          createActivity(s, e2 - s + 1, rowId);
        }

        setDragState(null);
        isDraggingRef.current = false;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    // `checkDoubleTap` is memoised now, so it can be declared honestly instead of omitted.
    [createActivity, checkDoubleTap],
  );

  const ghostBar = dragState
    ? (() => {
        const from = Math.min(dragState.startMonth, dragState.currentMonth);
        const span = Math.abs(dragState.currentMonth - dragState.startMonth) + 1;
        return {
          rowId: dragState.rowId,
          left: unitSpanToLeft(from, span, dragState.monthWidth, dragState.totalUnits, isRtl),
          width: span * dragState.monthWidth,
        };
      })()
    : null;

  return { onPointerDown, onDoubleClick, ghostBar };
}
