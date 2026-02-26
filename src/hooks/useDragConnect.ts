import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { AnchorSide } from '@/types/gantt';
import { useStore } from '@/stores';
import { getActivityRect, getAnchorPoint } from '@/utils/dependencyRouting';
import type { RowLayout } from '@/components/GanttChart/GanttChart';

export type DragConnectState = {
  fromActivityId: string;
  fromSide: AnchorSide;
  fromPoint: { x: number; y: number };
  mouseX: number;
  mouseY: number;
  snapTarget: {
    activityId: string;
    side: AnchorSide;
    point: { x: number; y: number };
  } | null;
} | null;

const SNAP_DISTANCE = 20;
const ANCHOR_SIDES: AnchorSide[] = ['left', 'right', 'top', 'bottom'];

export function useDragConnect(rows: RowLayout[], monthWidth: number) {
  const [dragState, setDragState] = useState<DragConnectState>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const addDependency = useStore((s) => s.addDependency);
  const addDependencyRef = useRef(addDependency);
  addDependencyRef.current = addDependency;
  const activities = useStore((s) => s.chart.activities);
  const isDragging = dragState !== null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const isDraggingStable = useMemo(() => isDragging, [isDragging]);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const monthWidthRef = useRef(monthWidth);
  monthWidthRef.current = monthWidth;
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  const onAnchorMouseDown = useCallback(
    (e: React.MouseEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => {
      e.stopPropagation();
      e.preventDefault();

      const container = document.querySelector('[data-timeline-body]');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      setDragState({
        fromActivityId: activityId,
        fromSide: side,
        fromPoint: anchorPoint,
        mouseX: e.clientX - containerRect.left,
        mouseY: e.clientY - containerRect.top,
        snapTarget: null,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragState) return;

    function findSnapTarget(mx: number, my: number) {
      const current = dragRef.current;
      if (!current) return null;

      let bestDist = SNAP_DISTANCE;
      let bestTarget: NonNullable<DragConnectState>['snapTarget'] = null;

      for (const row of rowsRef.current) {
        for (const aid of row.activityIds) {
          if (aid === current.fromActivityId) continue;
          const act = activitiesRef.current.find((a) => a.id === aid);
          if (!act) continue;
          const rect = getActivityRect(act, row.y, monthWidthRef.current, act.rowSpan ?? 1);
          for (const side of ANCHOR_SIDES) {
            const pt = getAnchorPoint(rect, side);
            const dist = Math.hypot(pt.x - mx, pt.y - my);
            if (dist < bestDist) {
              bestDist = dist;
              bestTarget = { activityId: aid, side, point: pt };
            }
          }
        }
      }
      return bestTarget;
    }

    function handleMouseMove(e: MouseEvent) {
      const container = document.querySelector('[data-timeline-body]');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const mx = e.clientX - containerRect.left;
      const my = e.clientY - containerRect.top;
      const snap = findSnapTarget(mx, my);

      setDragState((prev) => {
        if (!prev) return null;
        return { ...prev, mouseX: mx, mouseY: my, snapTarget: snap };
      });
    }

    function handleMouseUp() {
      const current = dragRef.current;
      if (current?.snapTarget) {
        addDependencyRef.current({
          fromActivityId: current.fromActivityId,
          toActivityId: current.snapTarget.activityId,
          fromSide: current.fromSide,
          toSide: current.snapTarget.side,
        });
      }
      setDragState(null);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingStable]);

  return { dragState, onAnchorMouseDown };
}
