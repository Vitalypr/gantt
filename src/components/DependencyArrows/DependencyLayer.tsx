import { useMemo } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import type { RowLayout } from '@/components/GanttChart/GanttChart';
import type { DragConnectState } from '@/hooks/useDragConnect';
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
  timelineWidth,
  bodyHeight,
  dragConnect,
}: DependencyLayerProps) {
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const activities = useStore((s) => s.chart.activities);
  const dependencies = useStore((s) => s.chart.dependencies);
  const selectedDependency = useStore((s) => s.selectedDependency);
  const selectDependency = useStore((s) => s.selectDependency);

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

        const fromRect = getActivityRect(fromActivity, fromRowY, monthWidth, fromActivity.rowSpan ?? 1, rowHeight);
        const toRect = getActivityRect(toActivity, toRowY, monthWidth, toActivity.rowSpan ?? 1, rowHeight);
        const fromPt = getAnchorPoint(fromRect, dep.fromSide);
        const toPt = getAnchorPoint(toRect, dep.toSide);
        const waypoints = routeOrthogonal(fromPt, dep.fromSide, toPt, dep.toSide, rowHeight);
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
  );
}
