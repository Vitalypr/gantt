import { useState, useCallback, useRef } from 'react';
import { ANCHOR_SIDES, type AnchorSide } from '@/types/gantt';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { getActivityRect, getAnchorPoint } from '@/utils/dependencyRouting';
import { resolveAnchorSide } from '@/utils/timeline';
import { totalUnits as totalUnitsOf } from '@/stores/selectors';
import type { RowLayout } from '@/components/GanttChart/GanttChart';
import { useLatest } from '@/hooks/useLatest';

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
  // Written by the pointer handlers themselves, NOT via useLatest. An effect-synced ref
  // lags by a commit, so a flick where the last pointermove and the pointerup land in the
  // same frame would read a stale snap target and silently drop the dependency.
  const dragRef = useRef<DragConnectState>(null);

  const applyDrag = (
    next: DragConnectState | ((prev: DragConnectState) => DragConnectState),
  ) => {
    const resolved = typeof next === 'function' ? next(dragRef.current) : next;
    dragRef.current = resolved;
    setDragState(resolved);
  };

  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const rowHeightRef = useLatest(rowHeight);

  const addDependency = useStore((s) => s.addDependency);
  const addDependencyRef = useLatest(addDependency);
  const activities = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.activities : s.chart.activities);

  const rowsRef = useLatest(rows);
  const monthWidthRef = useLatest(monthWidth);
  const activitiesRef = useLatest(activities);

  const onAnchorPointerDown = useCallback(
    (e: React.PointerEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => {
      e.stopPropagation();

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const container = document.querySelector('[data-timeline-body]');
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      applyDrag({
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
            const st = useStore.getState();
            const rect = getActivityRect({
              activity: act,
              rowY: row.y,
              unitWidth: monthWidthRef.current,
              totalUnits: totalUnitsOf(st),
              isRtl: st.chartDirection === 'rtl',
              rowSpan: act.rowSpan ?? 1,
              rowHeight: rowHeightRef.current,
            });
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

        applyDrag((prev) => {
          if (!prev) return null;
          return { ...prev, mouseX: mx, mouseY: my, snapTarget: bestTarget };
        });
      };

      const handlePointerUp = () => {
        target.onpointermove = null;
        target.onpointerup = null;

        const current = dragRef.current;
        if (current?.snapTarget) {
          // `fromSide`/`toSide` here are PHYSICAL — they came from the anchor dot the pointer
          // touched. Dependencies persist TEMPORAL sides, and `resolveAnchorSide` is an
          // involution, so the same call converts physical -> temporal on the way in.
          const rtl = useStore.getState().chartDirection === 'rtl';
          addDependencyRef.current({
            fromActivityId: current.fromActivityId,
            toActivityId: current.snapTarget.activityId,
            fromSide: resolveAnchorSide(current.fromSide, rtl),
            toSide: resolveAnchorSide(current.snapTarget.side, rtl),
          });
        }
        applyDrag(null);
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [],
  );

  return { dragState, onAnchorPointerDown };
}
