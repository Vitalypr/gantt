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

  const onMouseDown = useCallback(
    (e: React.MouseEvent, activityId: string, currentStartMonth: number) => {
      e.preventDefault();
      e.stopPropagation();
      startXRef.current = e.clientX;
      isDraggingRef.current = false;

      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
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

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

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

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [updateActivity],
  );

  return { onMouseDown, dragState };
}
