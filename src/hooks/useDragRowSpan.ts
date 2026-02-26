import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_HEIGHT } from '@/constants/timeline';

const DRAG_THRESHOLD = 4;

type DragRowSpanState = {
  activityId: string;
  originalRowSpan: number;
  currentRowSpan: number;
} | null;

export function useDragRowSpan() {
  const updateActivity = useStore((s) => s.updateActivity);
  const [dragState, setDragState] = useState<DragRowSpanState>(null);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef<DragRowSpanState>(null);

  const updateDragState = (next: DragRowSpanState) => {
    dragStateRef.current = next;
    setDragState(next);
  };

  const onMouseDown = useCallback(
    (e: React.MouseEvent, activityId: string, currentRowSpan: number) => {
      e.preventDefault();
      e.stopPropagation();
      startYRef.current = e.clientY;
      isDraggingRef.current = false;

      document.body.style.userSelect = 'none';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startYRef.current;

        if (!isDraggingRef.current) {
          if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          document.body.style.cursor = 'ns-resize';
          updateDragState({
            activityId,
            originalRowSpan: currentRowSpan,
            currentRowSpan,
          });
        }

        // Snap to 1 or 2 based on delta crossing half-row threshold
        const threshold = ROW_HEIGHT / 2;
        let newRowSpan: number;
        if (currentRowSpan === 1) {
          // Dragging from span-1: expand to 2 if dragged down past threshold
          newRowSpan = deltaY > threshold ? 2 : 1;
        } else {
          // Dragging from span-2: shrink to 1 if dragged up past threshold
          newRowSpan = deltaY < -threshold ? 1 : 2;
        }

        const prev = dragStateRef.current;
        if (prev && prev.currentRowSpan !== newRowSpan) {
          updateDragState({ ...prev, currentRowSpan: newRowSpan });
        }
      };

      const handleMouseUp = () => {
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        if (isDraggingRef.current) {
          const prev = dragStateRef.current;
          updateDragState(null);
          if (prev && prev.currentRowSpan !== prev.originalRowSpan) {
            updateActivity(prev.activityId, {
              rowSpan: prev.currentRowSpan,
            });
          }
        } else {
          updateDragState(null);
        }

        isDraggingRef.current = false;
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [updateActivity],
  );

  return { onMouseDown, dragState };
}
