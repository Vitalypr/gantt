import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { DEFAULT_ACTIVITY_COLOR } from '@/constants/colors';

const DRAG_THRESHOLD = 6;
const DOUBLE_CLICK_DELAY = 300; // ms

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

  const lastClickRef = useRef<{ time: number; rowId: string; x: number }>({
    time: 0,
    rowId: '',
    x: 0,
  });
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

  const onMouseDown = useCallback(
    (e: React.MouseEvent, rowId: string, timelineLeftOffset: number, monthWidth: number) => {
      if (e.button !== 0) return;

      const relativeX = e.clientX - timelineLeftOffset;
      const startMonth = Math.max(0, Math.floor(relativeX / monthWidth));
      const now = Date.now();

      // Detect double-click: same row, close position, within time window
      const last = lastClickRef.current;
      const isDoubleClick =
        now - last.time < DOUBLE_CLICK_DELAY &&
        last.rowId === rowId &&
        Math.abs(e.clientX - last.x) < 30;

      if (isDoubleClick) {
        // Reset to prevent triple-click
        lastClickRef.current = { time: 0, rowId: '', x: 0 };
        // Create 1-month activity at click position
        createActivity(startMonth, 1, rowId);
        return;
      }

      // Record this click for double-click detection
      lastClickRef.current = { time: now, rowId, x: e.clientX };

      startXRef.current = e.clientX;
      isDraggingRef.current = false;

      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;

        if (!isDraggingRef.current) {
          if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          // Clear double-click timer since user is dragging
          lastClickRef.current = { time: 0, rowId: '', x: 0 };
        }

        const currentX = moveEvent.clientX - timelineLeftOffset;
        const currentMonth = Math.max(0, Math.floor(currentX / monthWidth));
        setDragState({ rowId, startMonth, currentMonth, monthWidth });
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        if (isDraggingRef.current) {
          const endX = upEvent.clientX - timelineLeftOffset;
          const endMonth = Math.max(0, Math.round(endX / monthWidth));
          const s = Math.min(startMonth, endMonth);
          const e2 = Math.max(startMonth, endMonth);
          const duration = Math.max(1, e2 - s);

          createActivity(s, duration, rowId);
        }

        setDragState(null);
        isDraggingRef.current = false;
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
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

  return { onMouseDown, ghostBar };
}
