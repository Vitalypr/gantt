import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { rowIndexAtY, timelineBodyTop } from '@/utils/layout';
import type { RowLayout } from '@/components/GanttChart/GanttChart';
import { useLatest } from '@/hooks/useLatest';

const DRAG_THRESHOLD = 4;

export type DragRowSpanState = {
  activityId: string;
  direction: 'top' | 'bottom';
  originalRowSpan: number;
  currentRowSpan: number;
  /** Number of rows the bar has shifted upward (0 for bottom drag) */
  topOffset: number;
} | null;

export function useDragRowSpan(rows: RowLayout[]) {
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const setActivityRowSpan = useStore((s) => s.setActivityRowSpan);
  const [dragState, setDragState] = useState<DragRowSpanState>(null);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef<DragRowSpanState>(null);

  const rowsRef = useLatest(rows);
  const rowHeightRef = useLatest(rowHeight);

  const updateDragState = (next: DragRowSpanState) => {
    dragStateRef.current = next;
    setDragState(next);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent, activityId: string, currentRowSpan: number, direction: 'top' | 'bottom', rowId: string) => {
      e.stopPropagation();
      startYRef.current = e.clientY;
      isDraggingRef.current = false;

      const bodyTop = timelineBodyTop();
      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

      document.body.style.userSelect = 'none';

      // Find row index for this activity
      const sortedRows = rowsRef.current;
      const rowIndex = sortedRows.findIndex((r) => r.rowId === rowId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaY = moveEvent.clientY - startYRef.current;
        const rh = rowHeightRef.current;

        if (!isDraggingRef.current) {
          if (Math.abs(deltaY) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          document.body.style.cursor = 'ns-resize';
          updateDragState({
            activityId,
            direction,
            originalRowSpan: currentRowSpan,
            currentRowSpan,
            topOffset: 0,
          });
        }

        // From the rendered bands, not a pitch: `deltaY / rh` assumes every row sits at the
        // same spacing, and over-counts a row for every gap the pointer crosses if one ever
        // does.
        const hit = rowIndexAtY(sortedRows, rh, moveEvent.clientY - bodyTop);
        const rowDelta = hit >= 0 && rowIndex >= 0 ? hit - rowIndex : Math.round(deltaY / rh);

        if (direction === 'bottom') {
          // Bottom edge: positive delta = expand, negative = shrink
          const maxDown = sortedRows.length - rowIndex;
          const newSpan = Math.max(1, Math.min(maxDown, currentRowSpan + rowDelta));
          const prev = dragStateRef.current;
          if (prev && prev.currentRowSpan !== newSpan) {
            updateDragState({ ...prev, currentRowSpan: newSpan, topOffset: 0 });
          }
        } else {
          // Top edge: negative delta = expand up, positive = shrink from top
          const expandUp = Math.max(0, Math.min(rowIndex, -rowDelta));
          const shrinkDown = Math.max(0, Math.min(currentRowSpan - 1, rowDelta));
          let newTopOffset: number;
          let newSpan: number;
          if (rowDelta <= 0) {
            // Expanding upward
            newTopOffset = expandUp;
            newSpan = currentRowSpan + expandUp;
          } else {
            // Shrinking from top
            newTopOffset = -shrinkDown;
            newSpan = currentRowSpan - shrinkDown;
          }
          const prev = dragStateRef.current;
          if (prev && (prev.currentRowSpan !== newSpan || prev.topOffset !== newTopOffset)) {
            updateDragState({ ...prev, currentRowSpan: newSpan, topOffset: newTopOffset });
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
            const changed = prev.currentRowSpan !== prev.originalRowSpan || prev.topOffset !== 0;
            if (changed) {
              // ONE commit for span + row. Two calls cost two Ctrl+Z presses and pass
              // through a state the user never saw.
              const targetIndex = rowIndex + (prev.direction === 'top' ? -prev.topOffset : 0);
              const targetRow = prev.topOffset !== 0 ? sortedRows[targetIndex] : undefined;
              setActivityRowSpan(prev.activityId, prev.currentRowSpan, targetRow?.rowId);
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
    [setActivityRowSpan],
  );

  return { onPointerDown, dragState };
}
