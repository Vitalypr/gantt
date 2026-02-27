import { useState, useCallback, useRef } from 'react';
import { ANCHOR_SIDES, type AnchorSide } from '@/types/gantt';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
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

export function useDragConnect(rows: RowLayout[], monthWidth: number) {
  const [dragState, setDragState] = useState<DragConnectState>(null);
  const dragRef = useRef(dragState);
  dragRef.current = dragState;

  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const rowHeightRef = useRef(rowHeight);
  rowHeightRef.current = rowHeight;

  const addDependency = useStore((s) => s.addDependency);
  const addDependencyRef = useRef(addDependency);
  addDependencyRef.current = addDependency;
  const activities = useStore((s) => s.chart.activities);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const monthWidthRef = useRef(monthWidth);
  monthWidthRef.current = monthWidth;
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;

  const onAnchorPointerDown = useCallback(
    (e: React.PointerEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => {
      e.stopPropagation();

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

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

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const cRect = document.querySelector('[data-timeline-body]')?.getBoundingClientRect();
        if (!cRect) return;
        const mx = moveEvent.clientX - cRect.left;
        const my = moveEvent.clientY - cRect.top;

        let bestDist = SNAP_DISTANCE;
        let bestTarget: NonNullable<DragConnectState>['snapTarget'] = null;

        for (const row of rowsRef.current) {
          for (const aid of row.activityIds) {
            if (aid === activityId) continue;
            const act = activitiesRef.current.find((a) => a.id === aid);
            if (!act) continue;
            const rect = getActivityRect(act, row.y, monthWidthRef.current, act.rowSpan ?? 1, rowHeightRef.current);
            for (const s of ANCHOR_SIDES) {
              const pt = getAnchorPoint(rect, s);
              const dist = Math.hypot(pt.x - mx, pt.y - my);
              if (dist < bestDist) {
                bestDist = dist;
                bestTarget = { activityId: aid, side: s, point: pt };
              }
            }
          }
        }

        setDragState((prev) => {
          if (!prev) return null;
          return { ...prev, mouseX: mx, mouseY: my, snapTarget: bestTarget };
        });
      };

      const handlePointerUp = () => {
        target.onpointermove = null;
        target.onpointerup = null;

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
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [],
  );

  return { dragState, onAnchorPointerDown };
}
