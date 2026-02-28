import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';

const DRAG_THRESHOLD = 4;

type DragResizeState = {
  activityId: string;
  edge: 'left' | 'right';
  originalStartMonth: number;
  originalDuration: number;
  currentStartMonth: number;
  currentDuration: number;
} | null;

export function useDragResize() {
  const monthWidth = useStore((s) => s.timelineMode === 'weeks' ? s.effectiveWeekWidth : s.effectiveMonthWidth);
  const updateActivity = useStore((s) => s.updateActivity);
  const [dragState, setDragState] = useState<DragResizeState>(null);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef<DragResizeState>(null);
  const monthWidthRef = useRef(monthWidth);
  monthWidthRef.current = monthWidth;

  const updateDragState = (next: DragResizeState) => {
    dragStateRef.current = next;
    setDragState(next);
  };

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      edge: 'left' | 'right',
      activityId: string,
      startMonth: number,
      durationMonths: number,
    ) => {
      e.stopPropagation();
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
          document.body.style.cursor = 'ew-resize';
          updateDragState({
            activityId,
            edge,
            originalStartMonth: startMonth,
            originalDuration: durationMonths,
            currentStartMonth: startMonth,
            currentDuration: durationMonths,
          });
        }

        const deltaMonths = Math.round(deltaX / monthWidthRef.current);

        if (edge === 'left') {
          const newStart = startMonth + deltaMonths;
          const newDuration = durationMonths - deltaMonths;
          if (newDuration >= 1 && newStart >= 0) {
            const prev = dragStateRef.current;
            if (prev) {
              updateDragState({ ...prev, currentStartMonth: newStart, currentDuration: newDuration });
            }
          }
        } else {
          const newDuration = Math.max(1, durationMonths + deltaMonths);
          const prev = dragStateRef.current;
          if (prev) {
            updateDragState({ ...prev, currentDuration: newDuration });
          }
        }
      };

      const handlePointerUp = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        target.onpointermove = null;
        target.onpointerup = null;

        if (isDraggingRef.current) {
          const prev = dragStateRef.current;
          updateDragState(null);
          if (prev) {
            const changed =
              prev.currentStartMonth !== prev.originalStartMonth ||
              prev.currentDuration !== prev.originalDuration;
            if (changed) {
              updateActivity(prev.activityId, {
                startMonth: prev.currentStartMonth,
                durationMonths: prev.currentDuration,
              });
            }
          }
        } else {
          updateDragState(null);
        }

        isDraggingRef.current = false;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [updateActivity],
  );

  return { onPointerDown, dragState };
}
