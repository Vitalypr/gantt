import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { DEFAULT_ACTIVITY_COLOR } from '@/constants/colors';
import { useDoubleTap } from '@/hooks/useDoubleTap';

const DRAG_THRESHOLD = 20;

type DragCreateState = {
  rowId: string;
  startMonth: number;
  currentMonth: number;
  monthWidth: number;
} | null;

export function useDragCreate() {
  const addActivity = useStore((s) => s.addActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);
  const [dragState, setDragState] = useState<DragCreateState>(null);

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

  const onPointerDown = useCallback(
    (e: React.PointerEvent, rowId: string, timelineLeftOffset: number, monthWidth: number) => {
      if (e.button !== 0) return;

      const relativeX = e.clientX - timelineLeftOffset;
      const startMonth = Math.max(0, Math.floor(relativeX / monthWidth));

      // Double-tap detection (key = rowId so taps on different rows don't pair)
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

        const currentX = moveEvent.clientX - timelineLeftOffset;
        const currentMonth = Math.max(0, Math.floor(currentX / monthWidth));
        setDragState({ rowId, startMonth, currentMonth, monthWidth });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        document.body.style.userSelect = '';
        target.onpointermove = null;
        target.onpointerup = null;

        if (isDraggingRef.current) {
          const endX = upEvent.clientX - timelineLeftOffset;
          const endMonth = Math.max(0, Math.round(endX / monthWidth));
          const s = Math.min(startMonth, endMonth);
          const e2 = Math.max(startMonth, endMonth);
          const duration = e2 - s;

          // Only create if the drag actually spans at least 1 month
          if (duration >= 1) {
            createActivity(s, duration, rowId);
          }
        }

        setDragState(null);
        isDraggingRef.current = false;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [createActivity],
  );

  const ghostBar = dragState
    ? {
        rowId: dragState.rowId,
        left: Math.min(dragState.startMonth, dragState.currentMonth) * dragState.monthWidth,
        width: Math.max(1, Math.abs(dragState.currentMonth - dragState.startMonth)) * dragState.monthWidth,
      }
    : null;

  return { onPointerDown, ghostBar };
}
