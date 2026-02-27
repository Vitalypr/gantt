import { ROW_SIZE_MAP } from '@/constants/timeline';
import { useStore } from '@/stores';
import { ActivityBar } from '@/components/Activity/ActivityBar';
import { MilestoneMarker } from '@/components/Activity/MilestoneMarker';
import type { AnchorSide } from '@/types/gantt';
import type { useDragCreate } from '@/hooks/useDragCreate';
import type { useDragMove } from '@/hooks/useDragMove';
import type { useDragResize } from '@/hooks/useDragResize';
import type { useDragRowSpan } from '@/hooks/useDragRowSpan';

type Row = {
  rowId: string;
  activityIds: string[];
  y: number;
  mergedWithNext?: boolean;
};

type TimelineBodyProps = {
  rows: Row[];
  monthWidth: number;
  sidebarWidth: number;
  dragCreate: ReturnType<typeof useDragCreate>;
  dragMove: ReturnType<typeof useDragMove>;
  dragResize: ReturnType<typeof useDragResize>;
  dragRowSpan: ReturnType<typeof useDragRowSpan>;
  onAnchorPointerDown?: (e: React.PointerEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => void;
};

export function TimelineBody({
  rows,
  monthWidth,
  sidebarWidth,
  dragCreate,
  dragMove,
  dragResize,
  dragRowSpan,
  onAnchorPointerDown,
}: TimelineBodyProps) {
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const allActivities = useStore((s) => s.chart.activities);
  const selectedActivity = useStore((s) => s.selectedActivity);
  const selectActivity = useStore((s) => s.selectActivity);
  const editingActivity = useStore((s) => s.editingActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);
  const selectDependency = useStore((s) => s.selectDependency);

  return (
    <div className="absolute inset-0">
      {rows.map((row) => {
        const activities = row.activityIds
          .map((aid) => allActivities.find((a) => a.id === aid))
          .filter((a): a is NonNullable<typeof a> => a != null);

        const hasSpanningActivity = activities.some((a) => {
          const span = dragRowSpan.dragState?.activityId === a.id
            ? dragRowSpan.dragState.currentRowSpan
            : (a.rowSpan ?? 1);
          return span > 1;
        });

        return (
          <div
            key={`ar-${row.rowId}`}
            className="absolute empty-row"
            style={{
              top: row.y,
              height: rowHeight,
              left: 0,
              right: 0,
              overflow: 'visible',
              zIndex: hasSpanningActivity ? 1 : undefined,
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              if ((e.target as HTMLElement).closest('[data-activity-bar]')) return;
              selectDependency(null);
              const scrollContainer = document.querySelector('[data-gantt-scroll]');
              const scrollLeft = scrollContainer?.scrollLeft ?? 0;
              const offset = sidebarWidth - scrollLeft;
              dragCreate.onPointerDown(e, row.rowId, offset, monthWidth);
            }}
          >
            {/* Ghost bar from drag-create */}
            {dragCreate.ghostBar?.rowId === row.rowId && (
              <div
                className="ghost-bar absolute top-1 h-[calc(100%-8px)]"
                style={{
                  left: dragCreate.ghostBar.left,
                  width: dragCreate.ghostBar.width,
                }}
              />
            )}

            {/* Empty row hint */}
            {activities.length === 0 && (
              <div className="empty-row-hint absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/40">Double-click or drag to create</span>
              </div>
            )}

            {/* Render all activities in this row */}
            {activities.map((activity) => {
              const isSelected = selectedActivity?.activityId === activity.id;
              const isEditing = editingActivity?.activityId === activity.id;

              const moveOverride =
                dragMove.dragState?.activityId === activity.id
                  ? dragMove.dragState
                  : null;

              const resizeOverride =
                dragResize.dragState?.activityId === activity.id
                  ? dragResize.dragState
                  : null;

              if (activity.isMilestone) {
                return (
                  <MilestoneMarker
                    key={activity.id}
                    activity={activity}
                    monthWidth={monthWidth}
                    isSelected={isSelected}
                    isEditing={isEditing}
                    moveOverride={moveOverride}
                    onSelect={() => selectActivity({ activityId: activity.id })}
                    onDoubleClick={() => setEditingActivity({ activityId: activity.id })}
                    onDragMoveStart={(e) => dragMove.onPointerDown(e, activity.id, activity.startMonth)}
                    onAnchorPointerDown={onAnchorPointerDown}
                  />
                );
              }

              const activityRowSpan = activity.rowSpan ?? 1;
              const isDraggingThisSpan = dragRowSpan.dragState?.activityId === activity.id;
              const rowSpanOverride = isDraggingThisSpan
                ? dragRowSpan.dragState!.currentRowSpan
                : null;
              const topOffsetOverride = isDraggingThisSpan
                ? dragRowSpan.dragState!.topOffset
                : null;

              return (
                <ActivityBar
                  key={activity.id}
                  activity={activity}
                  monthWidth={monthWidth}
                  isSelected={isSelected}
                  isEditing={isEditing}
                  moveOverride={moveOverride}
                  resizeOverride={resizeOverride}
                  rowSpan={activityRowSpan}
                  rowSpanOverride={rowSpanOverride}
                  topOffsetOverride={topOffsetOverride}
                  onSelect={() => selectActivity({ activityId: activity.id })}
                  onDoubleClick={() => setEditingActivity({ activityId: activity.id })}
                  onDragMoveStart={(e) => dragMove.onPointerDown(e, activity.id, activity.startMonth)}
                  onDragResizeStart={(e, edge) =>
                    dragResize.onPointerDown(
                      e,
                      edge,
                      activity.id,
                      activity.startMonth,
                      activity.durationMonths,
                    )
                  }
                  onDragRowSpanStart={(e, direction) => dragRowSpan.onPointerDown(e, activity.id, activityRowSpan, direction, row.rowId)}
                  onAnchorPointerDown={onAnchorPointerDown}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
