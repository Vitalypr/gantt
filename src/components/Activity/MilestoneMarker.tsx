import { useState } from 'react';
import type { Activity, AnchorSide } from '@/types/gantt';
import { ANCHOR_SIDES } from '@/types/gantt';
import { MILESTONE_OUTLINE_WIDTH, STATUS_RAIL_RESERVE } from '@/constants/timeline';
import { useStore } from '@/stores';
import { unitSpanToLeft } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { AnnotationPopover } from './AnnotationPopover';
import { ActivityNameInput } from './ActivityNameInput';
import { ActivityContextMenu } from './ActivityContextMenu';
import { StatusMark } from './StatusMark';
import { effectiveFontSize, formatDiffers, statusDrawsRail } from '@/utils/activity';

type MilestoneMarkerProps = {
  activity: Activity;
  monthWidth: number;
  totalUnits: number;
  isSelected: boolean;
  isEditing: boolean;
  moveOverride: { currentStartMonth: number } | null;
  /** Vertical preview offset in px while the marker is being dragged across rows. */
  dragOffsetY?: number;
  /** `additive` is true for Ctrl/Cmd/Shift-click: extend the selection instead of replacing it. */
  onSelect: (additive: boolean) => void;
  onDoubleClick: () => void;
  onDragMoveStart: (e: React.PointerEvent) => void;
  onAnchorPointerDown?: (e: React.PointerEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => void;
};

/**
 * A milestone is a one-unit bar carrying a heavy perimeter frame — not a diamond.
 *
 * It therefore occupies exactly the pixels a one-unit activity would, which is what lets
 * `getActivityRect` describe both with one computation. The frame is what distinguishes it;
 * do not shrink the shape instead, because a smaller box reads as a lesser thing rather than
 * a different one. The frame is drawn with a negative-offset `outline` so it sits inside the
 * box without shifting layout or the rect that dependency arrows attach to.
 */
export function MilestoneMarker({
  activity,
  monthWidth,
  totalUnits,
  isSelected,
  isEditing,
  moveOverride,
  dragOffsetY = 0,
  onSelect,
  onDoubleClick,
  onDragMoveStart,
  onAnchorPointerDown,
}: MilestoneMarkerProps) {
  const setEditingActivity = useStore((s) => s.setEditingActivity);
  const showStatus = useStore((s) => s.showStatus);
  const formatPainter = useStore((s) => s.formatPainter);
  const disarmFormatPainter = useStore((s) => s.disarmFormatPainter);
  const updateActivity = useStore((s) => s.updateActivity);

  /**
   * Paste the armed format, if there is one. Returns true when it consumed the gesture, so the
   * caller can stop before selecting or starting a drag — a painter click must not also move
   * the bar it lands on.
   */
  const paintIfArmed = (): boolean => {
    if (!formatPainter) return false;
    // One `updateActivity` for all four fields, so a paste is one Ctrl+Z.
    if (formatDiffers(activity, formatPainter.format)) {
      updateActivity(activity.id, formatPainter.format);
    }
    if (!formatPainter.sticky) disarmFormatPainter();
    return true;
  };


  const checkDoubleTap = useDoubleTap();

  const [annotationOpen, setAnnotationOpen] = useState(false);

  const { isRtl } = useChartDirection();
  const startMonth = moveOverride?.currentStartMonth ?? activity.startMonth;
  const left = unitSpanToLeft(startMonth, 1, monthWidth, totalUnits, isRtl);

  const isDark = isColorDark(activity.color);
  const labelColor = activity.labelColor ?? (isDark ? '#ffffff' : '#0f172a');
  const fontSize = effectiveFontSize(activity);
  // Gold by default, and only by default: a frame the user set explicitly still wins. The
  // heavy frame is what distinguishes a milestone from a one-unit bar, so it carries the
  // distinction in colour as well as weight.
  const frameColor = activity.outlineColor ?? 'var(--color-milestone-outline)';
  const mark = showStatus ? activity.status : undefined;
  const rail = statusDrawsRail(mark);

  return (
    <ActivityContextMenu
      activity={activity}
      onRename={() => setEditingActivity({ activityId: activity.id })}
      onAnnotate={() => setAnnotationOpen(true)}
    >
      <div
        data-activity-bar
        data-activity-id={activity.id}
        data-milestone
        className={cn(
          'activity-bar group absolute flex items-center rounded-md',
          formatPainter ? 'cursor-copy' : 'cursor-grab',
          isSelected && 'activity-bar--selected ring-2 ring-ring ring-offset-1',
        )}
        style={{
          left,
          top: 4,
          width: monthWidth,
          height: 'calc(100% - 8px)',
          backgroundColor: activity.color,
          outline: `${MILESTONE_OUTLINE_WIDTH}px solid ${frameColor}`,
          outlineOffset: -MILESTONE_OUTLINE_WIDTH,
          paddingBottom: rail ? STATUS_RAIL_RESERVE : undefined,
          transform: dragOffsetY ? `translateY(${dragOffsetY}px)` : undefined,
          zIndex: dragOffsetY ? 30 : undefined,
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (formatPainter) return;
          onSelect(e.ctrlKey || e.metaKey || e.shiftKey);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          if (paintIfArmed()) {
            e.stopPropagation();
            return;
          }
          if (checkDoubleTap(e)) {
            e.stopPropagation();
            onDoubleClick();
            return;
          }
          onDragMoveStart(e);
        }}
      >
        <AnnotationPopover
          activityId={activity.id}
          annotation={activity.annotation}
          isEditing={isEditing}
          isOpen={annotationOpen}
          onOpenChange={setAnnotationOpen}
          iconColorStyle={{ color: labelColor }}
        />

        <div className="relative z-[2] flex min-w-0 flex-1 items-center justify-center self-stretch overflow-hidden px-1">
          {isEditing ? (
            <ActivityNameInput
                activityId={activity.id}
                name={activity.name}
                color={labelColor}
                fontSize={fontSize}
              />
          ) : (
            <span
              data-activity-label
              dir="auto"
              title={activity.name || undefined}
              className="block w-full text-center font-semibold leading-tight line-clamp-2"
              style={{ color: labelColor, fontSize, wordBreak: 'break-word' }}
            >
              {activity.name}
            </span>
          )}
        </div>

        {mark && <StatusMark status={mark} barColor={activity.color} isRtl={isRtl} />}

        {onAnchorPointerDown && (
          <>
            {ANCHOR_SIDES.map((side) => (
              <div
                key={side}
                className="anchor-dot"
                data-side={side}
                onPointerDown={(e) => {
                  const barEl = e.currentTarget.closest('[data-activity-bar]');
                  const container = document.querySelector('[data-timeline-body]');
                  if (!barEl || !container) return;
                  const barRect = barEl.getBoundingClientRect();
                  const containerRect = container.getBoundingClientRect();
                  const bw = barRect.width;
                  const bh = barRect.height;
                  const l = barRect.left - containerRect.left;
                  const t = barRect.top - containerRect.top;
                  const point =
                    side === 'left' ? { x: l, y: t + bh / 2 }
                    : side === 'right' ? { x: l + bw, y: t + bh / 2 }
                    : side === 'top' ? { x: l + bw / 2, y: t }
                    : { x: l + bw / 2, y: t + bh };
                  onAnchorPointerDown(e, activity.id, side, point);
                }}
              />
            ))}
          </>
        )}
      </div>
    </ActivityContextMenu>
  );
}
