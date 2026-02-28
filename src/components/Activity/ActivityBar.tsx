import { useState } from 'react';
import { Diamond, MessageSquareText, Palette, Pencil, Trash2 } from 'lucide-react';
import type { Activity, AnchorSide } from '@/types/gantt';
import { ANCHOR_SIDES } from '@/types/gantt';
import { EDGE_THRESHOLD } from '@/constants/timeline';
import { useStore } from '@/stores';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { useInlineEdit } from '@/hooks/useInlineEdit';
import { ColorPicker } from './ColorPicker';
import { AnnotationPopover } from './AnnotationPopover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';

type ActivityBarProps = {
  activity: Activity;
  monthWidth: number;
  isSelected: boolean;
  isEditing: boolean;
  moveOverride: { currentStartMonth: number } | null;
  resizeOverride: { currentStartMonth: number; currentDuration: number } | null;
  rowSpan: number;
  rowSpanOverride: number | null;
  topOffsetOverride: number | null;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragMoveStart: (e: React.PointerEvent) => void;
  onDragResizeStart: (e: React.PointerEvent, edge: 'left' | 'right') => void;
  onDragRowSpanStart: (e: React.PointerEvent, direction: 'top' | 'bottom') => void;
  onAnchorPointerDown?: (e: React.PointerEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => void;
};

export function ActivityBar({
  activity,
  monthWidth,
  isSelected,
  isEditing,
  moveOverride,
  resizeOverride,
  rowSpan,
  rowSpanOverride,
  topOffsetOverride,
  onSelect,
  onDoubleClick,
  onDragMoveStart,
  onDragResizeStart,
  onDragRowSpanStart,
  onAnchorPointerDown,
}: ActivityBarProps) {
  const updateActivity = useStore((s) => s.updateActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const selectActivity = useStore((s) => s.selectActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);
  const timelineMode = useStore((s) => s.timelineMode);

  const { inputRef, editValue, setEditValue, commitEdit, handleEditKeyDown } = useInlineEdit(activity.id, activity.name, isEditing);
  const checkDoubleTap = useDoubleTap();

  const [annotationOpen, setAnnotationOpen] = useState(false);
  const hasAnnotation = !!activity.annotation;

  const startMonth = moveOverride?.currentStartMonth ?? resizeOverride?.currentStartMonth ?? activity.startMonth;
  const duration = resizeOverride?.currentDuration ?? activity.durationMonths;

  const left = startMonth * monthWidth;
  const width = duration * monthWidth;

  const handleDelete = () => {
    removeActivity(activity.id);
    selectActivity(null);
  };

  const handleColorChange = (color: string) => {
    updateActivity(activity.id, { color });
  };

  const handleToggleMilestone = () => {
    updateActivity(activity.id, {
      isMilestone: true,
      durationMonths: 1,
    });
  };

  const isDark = isColorDark(activity.color);
  const effectiveRowSpan = rowSpanOverride ?? rowSpan;
  const isSpanning = effectiveRowSpan > 1;
  const heightStyle = `calc(${effectiveRowSpan * 100}% - 8px)`;
  const topOffset = topOffsetOverride ?? 0;
  const topStyle = topOffset > 0 ? `calc(4px - ${topOffset * 100}%)` : '4px';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-activity-bar
          className={cn(
            'activity-bar group absolute flex cursor-grab items-center rounded-md',
            isSelected && 'activity-bar--selected ring-2 ring-ring ring-offset-1',
          )}
          style={{
            left,
            top: topStyle,
            width: Math.max(width, monthWidth * 0.5),
            height: heightStyle,
            backgroundColor: activity.color,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onDoubleClick();
          }}
          onPointerDown={(e) => {
            if (e.button !== 0) return;

            // Double-tap detection (touch devices don't fire dblclick)
            if (checkDoubleTap(e)) {
              e.stopPropagation();
              onDoubleClick();
              return;
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const relY = e.clientY - rect.top;
            // Top edge triggers row span drag (upward)
            if (relY < EDGE_THRESHOLD) {
              onDragRowSpanStart(e, 'top');
              return;
            }
            // Bottom edge triggers row span drag (downward)
            if (relY > rect.height - EDGE_THRESHOLD) {
              onDragRowSpanStart(e, 'bottom');
              return;
            }
            if (relX < EDGE_THRESHOLD) {
              onDragResizeStart(e, 'left');
            } else if (relX > rect.width - EDGE_THRESHOLD) {
              onDragResizeStart(e, 'right');
            } else {
              onDragMoveStart(e);
            }
          }}
        >
          {/* Top resize handle for row span */}
          <div className="resize-handle resize-handle--top" />

          {/* Annotation icon + popover */}
          <AnnotationPopover
            activityId={activity.id}
            annotation={activity.annotation}
            isEditing={isEditing}
            isOpen={annotationOpen}
            onOpenChange={setAnnotationOpen}
            iconColorStyle={{ color: isDark ? '#ffffff' : '#0f172a' }}
          />

          {/* Left resize handle */}
          <div className="resize-handle resize-handle--left" />

          {/* Name label or edit input */}
          <div className="flex-1 overflow-hidden px-2">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
                className="w-full bg-transparent text-center text-xs font-medium outline-none"
                style={{ color: isDark ? '#ffffff' : '#0f172a' }}
              />
            ) : (
              <span
                className={cn(
                  'block text-center text-[10px] font-medium leading-tight',
                  effectiveRowSpan >= 3 ? '' : isSpanning ? 'line-clamp-4' : 'line-clamp-2',
                )}
                style={{
                  color: isDark ? '#ffffff' : '#0f172a',
                  wordBreak: 'break-word',
                }}
              >
                {activity.name}
              </span>
            )}
          </div>

          {/* Duration label - bottom right */}
          {!isEditing && duration > 1 && (
            <span
              className="absolute bottom-0.5 right-1 text-[9px] font-medium leading-none opacity-60"
              style={{ color: isDark ? '#ffffff' : '#0f172a' }}
            >
              {duration}{timelineMode === 'weeks' ? 'w' : 'm'}
            </span>
          )}

          {/* Right resize handle */}
          <div className="resize-handle resize-handle--right" />

          {/* Bottom resize handle for row span */}
          <div className="resize-handle resize-handle--bottom" />

          {/* Anchor dots for dependency connections */}
          {onAnchorPointerDown && (
            <>
              {ANCHOR_SIDES.map((side) => (
                <div
                  key={side}
                  className="anchor-dot"
                  data-side={side}
                  onPointerDown={(e) => {
                    const barEl = e.currentTarget.closest('[data-activity-bar]');
                    if (!barEl) return;
                    const barRect = barEl.getBoundingClientRect();
                    const container = document.querySelector('[data-timeline-body]');
                    if (!container) return;
                    const containerRect = container.getBoundingClientRect();
                    let px: number, py: number;
                    const bw = barRect.width;
                    const bh = barRect.height;
                    switch (side) {
                      case 'left':
                        px = barRect.left - containerRect.left;
                        py = barRect.top - containerRect.top + bh / 2;
                        break;
                      case 'right':
                        px = barRect.left - containerRect.left + bw;
                        py = barRect.top - containerRect.top + bh / 2;
                        break;
                      case 'top':
                        px = barRect.left - containerRect.left + bw / 2;
                        py = barRect.top - containerRect.top;
                        break;
                      case 'bottom':
                        px = barRect.left - containerRect.left + bw / 2;
                        py = barRect.top - containerRect.top + bh;
                        break;
                    }
                    onAnchorPointerDown(e, activity.id, side, { x: px, y: py });
                  }}
                />
              ))}
            </>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => setEditingActivity({ activityId: activity.id })}
        >
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem onClick={() => setAnnotationOpen(true)}>
          <MessageSquareText className="mr-2 h-3.5 w-3.5" />
          {hasAnnotation ? 'Edit Annotation' : 'Add Annotation'}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Palette className="mr-2 h-3.5 w-3.5" />
            Color
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorPicker currentColor={activity.color} onColorChange={handleColorChange} />
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleToggleMilestone}>
          <Diamond className="mr-2 h-3.5 w-3.5" />
          Convert to Milestone
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

