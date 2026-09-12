import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import type { RowLayout } from '@/components/GanttChart/GanttChart';
import type { DragConnectState } from '@/hooks/useDragConnect';
import { useChartDirection } from '@/hooks/useChartDirection';
import { resolveAnchorSide } from '@/utils/timeline';
import {
  getActivityRect,
  getAnchorPoint,
  routeOrthogonal,
  routeToMouse,
  pointsToSvgPath,
} from '@/utils/dependencyRouting';

type DependencyLayerProps = {
  rows: RowLayout[];
  monthWidth: number;
  totalUnits: number;
  timelineWidth: number;
  bodyHeight: number;
  dragConnect: DragConnectState;
};

const ARROW_COLOR = 'var(--color-dep-arrow)';
const ARROW_SELECTED_COLOR = 'var(--color-dep-arrow-selected)';
const GHOST_COLOR = 'var(--color-dep-ghost)';

export function DependencyLayer({
  rows,
  monthWidth,
  totalUnits,
  timelineWidth,
  bodyHeight,
  dragConnect,
}: DependencyLayerProps) {
  const { isRtl } = useChartDirection();
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const activities = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.activities : s.chart.activities);
  const dependencies = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.dependencies : s.chart.dependencies);
  const selectedDependency = useStore((s) => s.selectedDependency);
  const selectDependency = useStore((s) => s.selectDependency);
  const removeDependency = useStore((s) => s.removeDependency);

  const [ctxMenu, setCtxMenu] = useState<{ depId: string; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!ctxMenu) return;
    const handleDown = (e: PointerEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        closeCtxMenu();
      }
    };
    const handleScroll = () => closeCtxMenu();
    window.addEventListener('pointerdown', handleDown, true);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('pointerdown', handleDown, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [ctxMenu, closeCtxMenu]);

  const rowYMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows) {
      for (const aid of row.activityIds) {
        map.set(aid, row.y);
      }
    }
    return map;
  }, [rows]);

  const activityMap = useMemo(() => {
    const map = new Map<string, (typeof activities)[number]>();
    for (const a of activities) {
      map.set(a.id, a);
    }
    return map;
  }, [activities]);

  return (
    <>
      <svg
        className="absolute inset-0 pointer-events-none"
        width={timelineWidth}
        height={bodyHeight}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="dep-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={ARROW_COLOR} />
          </marker>
          <marker
            id="dep-arrow-selected"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L8,3 L0,6 Z" fill={ARROW_SELECTED_COLOR} />
          </marker>
        </defs>

        {dependencies.map((dep) => {
          const fromActivity = activityMap.get(dep.fromActivityId);
          const toActivity = activityMap.get(dep.toActivityId);
          if (!fromActivity || !toActivity) return null;

          const fromRowY = rowYMap.get(dep.fromActivityId);
          const toRowY = rowYMap.get(dep.toActivityId);
          if (fromRowY === undefined || toRowY === undefined) return null;

          const fromRect = getActivityRect({ activity: fromActivity, rowY: fromRowY, unitWidth: monthWidth, totalUnits, isRtl, rowSpan: fromActivity.rowSpan ?? 1, rowHeight });
          const toRect = getActivityRect({ activity: toActivity, rowY: toRowY, unitWidth: monthWidth, totalUnits, isRtl, rowSpan: toActivity.rowSpan ?? 1, rowHeight });
          // Sides persist TEMPORALLY and resolve to physical edges here. Storing them
          // physically would make the same JSON render differently per direction and turn a
          // finish-to-start hop into a chart-spanning U-detour on flip.
          const fromSide = resolveAnchorSide(dep.fromSide, isRtl);
          const toSide = resolveAnchorSide(dep.toSide, isRtl);
          const fromPt = getAnchorPoint(fromRect, fromSide);
          const toPt = getAnchorPoint(toRect, toSide);
          const waypoints = routeOrthogonal(fromPt, fromSide, toPt, toSide, rowHeight);
          const pathD = pointsToSvgPath(waypoints);
          const isSelected = selectedDependency?.dependencyId === dep.id;

          return (
            <g key={dep.id}>
              {/* Invisible hit area */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={12}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  selectDependency({ dependencyId: dep.id });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  selectDependency({ dependencyId: dep.id });
                  const container = (e.currentTarget as SVGElement).closest('[data-timeline-body]');
                  const rect = container?.getBoundingClientRect();
                  setCtxMenu({
                    depId: dep.id,
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0),
                  });
                }}
              />
              {/* Visible arrow */}
              <path
                d={pathD}
                fill="none"
                stroke={isSelected ? ARROW_SELECTED_COLOR : ARROW_COLOR}
                strokeWidth={isSelected ? 2 : 1.5}
                markerEnd={isSelected ? 'url(#dep-arrow-selected)' : 'url(#dep-arrow)'}
              />
            </g>
          );
        })}

        {/* Ghost/preview line during drag */}
        {dragConnect && (
          <path
            d={pointsToSvgPath(
              dragConnect.snapTarget
                ? routeOrthogonal(
                    dragConnect.fromPoint,
                    dragConnect.fromSide,
                    dragConnect.snapTarget.point,
                    dragConnect.snapTarget.side,
                    rowHeight,
                  )
                : routeToMouse(
                    dragConnect.fromPoint,
                    dragConnect.fromSide,
                    dragConnect.mouseX,
                    dragConnect.mouseY,
                  ),
            )}
            fill="none"
            stroke={dragConnect.snapTarget ? ARROW_COLOR : GHOST_COLOR}
            strokeWidth={1.5}
            strokeDasharray={dragConnect.snapTarget ? undefined : '4 4'}
            markerEnd={dragConnect.snapTarget ? 'url(#dep-arrow)' : undefined}
          />
        )}
      </svg>

      {/* Dependency context menu */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          className="absolute z-50 min-w-[140px] rounded-md border border-border bg-popover p-1 shadow-md"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent cursor-pointer"
            onClick={() => {
              removeDependency(ctxMenu.depId);
              selectDependency(null);
              closeCtxMenu();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </>
  );
}
