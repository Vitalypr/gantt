import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { clampStartUnit, deltaToUnits, visualEdgeToTemporalEdge } from '@/utils/timeline';
import { totalUnits as totalUnitsOf } from '@/stores/selectors';
import { useLatest } from '@/hooks/useLatest';

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
  const monthWidthRef = useLatest(monthWidth);

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

        const st = useStore.getState();
        const isRtl = st.chartDirection === 'rtl';
        const total = totalUnitsOf(st);
        const deltaMonths = deltaToUnits(deltaX, monthWidthRef.current, isRtl);

        // The edge the pointer touched is not necessarily the edge it controls: in RTL the
        // visually-left edge is the temporal END.
        const temporal = visualEdgeToTemporalEdge(edge, isRtl);
        const prev = dragStateRef.current;
        if (!prev) return;

        if (temporal === 'start') {
          const newDuration = durationMonths - deltaMonths;
          const newStart = clampStartUnit(startMonth + deltaMonths, newDuration, total);
          if (newDuration >= 1) {
            updateDragState({ ...prev, currentStartMonth: newStart, currentDuration: newDuration });
          }
        } else {
          // Clamp the far end too, or the bar leaves the sized grid track and the scroll
          // container cannot reach it.
          const newDuration = Math.max(1, Math.min(durationMonths + deltaMonths, total - startMonth));
          updateDragState({ ...prev, currentDuration: newDuration });
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
