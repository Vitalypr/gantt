import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';

const DRAG_THRESHOLD = 4; // px minimum movement before drag starts

type DragMoveState = {
  activityId: string;
  originalStartMonth: number;
  currentStartMonth: number;
} | null;

export function useDragMove() {
  const monthWidth = useStore((s) => s.monthWidth);
  const updateActivity = useStore((s) => s.updateActivity);
  const [dragState, setDragState] = useState<DragMoveState>(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const monthWidthRef = useRef(monthWidth);
  monthWidthRef.current = monthWidth;

  const onPointerDown = useCallback(
    (e: React.PointerEvent, activityId: string, currentStartMonth: number) => {
      e.stopPropagation();
      startXRef.current = e.clientX;
      isDraggingRef.current = false;

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startXRef.current;
        const mw = monthWidthRef.current;

        // Don't start dragging until threshold is exceeded
        if (!isDraggingRef.current) {
          if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          document.body.style.cursor = 'grabbing';
          setDragState({
            activityId,
            originalStartMonth: currentStartMonth,
            currentStartMonth,
          });
        }

        const deltaMonths = Math.round(deltaX / mw);
        const newStart = Math.max(0, currentStartMonth + deltaMonths);
        setDragState((prev) => (prev ? { ...prev, currentStartMonth: newStart } : null));
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        target.onpointermove = null;
        target.onpointerup = null;

        if (isDraggingRef.current) {
          const deltaX = upEvent.clientX - startXRef.current;
          const mw = monthWidthRef.current;
          const deltaMonths = Math.round(deltaX / mw);
          const newStart = Math.max(0, currentStartMonth + deltaMonths);

          if (newStart !== currentStartMonth) {
            updateActivity(activityId, { startMonth: newStart });
          }
        }

        setDragState(null);
        isDraggingRef.current = false;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [updateActivity],
  );

  return { onPointerDown, dragState };
}
