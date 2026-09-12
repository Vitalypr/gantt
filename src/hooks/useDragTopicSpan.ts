import { useCallback, useRef, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { useLatest } from '@/hooks/useLatest';
import { rowIndexAtY, timelineBodyTop } from '@/utils/layout';

const DRAG_THRESHOLD = 4;

export type TopicSpanPreview = {
  /** Index of the first row the cell will cover. */
  startIndex: number;
  span: number;
} | null;

type Row = { rowId: string; y: number };

/**
 * Drag in the topic column to say which rows share a topic.
 *
 * Two gestures, one hook, because they are the same drag on the same column:
 * from an EMPTY slot it creates a topic over the rows you sweep, and from a cell's bottom
 * edge it grows or shrinks that cell. Both mirror gestures the app already has — dragging
 * across a row to create a bar with a span, and dragging a bar's edge to span rows — so the
 * column needs no vocabulary of its own.
 *
 * The commit is a single `setTopicSpan`, so a whole sweep is one Ctrl+Z.
 */
export function useDragTopicSpan(rows: Row[]) {
  const setTopicSpan = useStore((s) => s.setTopicSpan);
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];

  const rowsRef = useLatest(rows);
  const rowHeightRef = useLatest(rowHeight);

  const [preview, setPreview] = useState<TopicSpanPreview>(null);
  const previewRef = useRef<TopicSpanPreview>(null);
  const isDraggingRef = useRef(false);

  const apply = (next: TopicSpanPreview) => {
    previewRef.current = next;
    setPreview(next);
  };

  const onPointerDown = useCallback(
    (e: React.PointerEvent, anchorRowId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const bands = rowsRef.current;
      const anchorIndex = bands.findIndex((r) => r.rowId === anchorRowId);
      if (anchorIndex < 0) return;

      const bodyTop = timelineBodyTop();
      const startY = e.clientY;
      isDraggingRef.current = false;

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);
      document.body.style.userSelect = 'none';

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) {
          if (Math.abs(moveEvent.clientY - startY) < DRAG_THRESHOLD) return;
          isDraggingRef.current = true;
          document.body.style.cursor = 'ns-resize';
        }
        const current = rowIndexAtY(
          rowsRef.current,
          rowHeightRef.current,
          moveEvent.clientY - bodyTop,
        );
        if (current < 0) return;
        // Sweeping upward past the anchor is still a valid range; the cell simply starts
        // higher up, which is what the pointer is describing.
        const startIndex = Math.min(anchorIndex, current);
        apply({ startIndex, span: Math.abs(current - anchorIndex) + 1 });
      };

      const end = () => {
        const last = previewRef.current;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        target.onpointermove = null;
        target.onpointerup = null;
        target.onpointercancel = null;
        apply(null);
        isDraggingRef.current = false;
        // Commit from what the preview last SHOWED, not from the pointerup position — the two
        // can disagree by a row when the release lands inside a topic gap.
        if (!last) return;
        const leader = rowsRef.current[last.startIndex];
        if (leader) setTopicSpan(leader.rowId, last.span);
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = end;
      target.onpointercancel = end;
    },
    [setTopicSpan, rowsRef, rowHeightRef],
  );

  return { onPointerDown, preview };
}
