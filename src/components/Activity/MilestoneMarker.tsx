import { useRef, useState, useEffect } from 'react';
import { Palette, Pencil, Trash2, RectangleHorizontal } from 'lucide-react';
import type { Activity, AnchorSide } from '@/types/gantt';
import { ROW_HEIGHT } from '@/constants/timeline';
import { useStore } from '@/stores';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { ColorPicker } from './ColorPicker';
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

type MilestoneMarkerProps = {
  activity: Activity;
  monthWidth: number;
  isSelected: boolean;
  isEditing: boolean;
  moveOverride: { currentStartMonth: number } | null;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDragMoveStart: (e: React.MouseEvent) => void;
  onAnchorMouseDown?: (e: React.MouseEvent, activityId: string, side: AnchorSide, anchorPoint: { x: number; y: number }) => void;
};

export function MilestoneMarker({
  activity,
  monthWidth,
  isSelected,
  isEditing,
  moveOverride,
  onSelect,
  onDoubleClick,
  onDragMoveStart,
  onAnchorMouseDown,
}: MilestoneMarkerProps) {
  const updateActivity = useStore((s) => s.updateActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const selectActivity = useStore((s) => s.selectActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);

  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  const [editValue, setEditValue] = useState(activity.name);

  const startMonth = moveOverride?.currentStartMonth ?? activity.startMonth;
  const left = startMonth * monthWidth;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      committedRef.current = false;
      setEditValue(activity.name);
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, activity.name]);

  const commitEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== activity.name) {
      updateActivity(activity.id, { name: trimmed });
    }
    setEditingActivity(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      committedRef.current = true;
      setEditingActivity(null);
    }
  };

  const handleDelete = () => {
    removeActivity(activity.id);
    selectActivity(null);
  };

  const handleColorChange = (color: string) => {
    updateActivity(activity.id, { color });
  };

  const handleConvertToActivity = () => {
    updateActivity(activity.id, {
      isMilestone: false,
      durationMonths: 1,
    });
  };

  const rhombusSize = 22;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          data-activity-bar
          className={cn(
            'absolute cursor-grab',
            isSelected && 'z-10',
          )}
          style={{
            left,
            top: 0,
            width: monthWidth,
            height: '100%',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onDoubleClick();
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            onDragMoveStart(e);
          }}
        >
          {/* Diamond centered in cell */}
          <div
            className="absolute"
            style={{
              top: '50%',
              left: '50%',
              width: rhombusSize,
              height: rhombusSize,
              transform: 'translate(-50%, -50%) rotate(45deg)',
              backgroundColor: activity.color,
              borderRadius: 2,
              boxShadow: isSelected
                ? `0 0 0 2px var(--color-ring), 0 2px 8px ${activity.color}40`
                : '0 1px 3px rgba(0,0,0,0.15)',
              transition: 'box-shadow 0.15s ease',
            }}
          />

          {/* Name label centered over the diamond */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
                className="pointer-events-auto w-16 bg-background/80 border border-ring rounded px-0.5 text-center text-[8px] font-bold outline-none z-20"
              />
            ) : (
              <span
                className="text-[8px] font-bold leading-tight z-10 max-w-full text-center line-clamp-2 px-0.5"
                style={{ color: isColorDark(activity.color) ? '#ffffff' : '#0f172a', wordBreak: 'break-word' }}
              >
                {activity.name}
              </span>
            )}
          </div>

          {/* Anchor dots for dependency connections */}
          {onAnchorMouseDown && (
            <>
              {(['left', 'right', 'top', 'bottom'] as const).map((side) => {
                const sz = rhombusSize;
                const cx = monthWidth / 2;
                const cy = ROW_HEIGHT / 2;
                let dotStyle: React.CSSProperties;
                switch (side) {
                  case 'left':
                    dotStyle = { left: cx - sz / 2 - 4, top: cy - 4 };
                    break;
                  case 'right':
                    dotStyle = { left: cx + sz / 2 - 4, top: cy - 4 };
                    break;
                  case 'top':
                    dotStyle = { left: cx - 4, top: cy - sz / 2 - 4 };
                    break;
                  case 'bottom':
                    dotStyle = { left: cx - 4, top: cy + sz / 2 - 4 };
                    break;
                }
                return (
                  <div
                    key={side}
                    className="anchor-dot"
                    style={{ ...dotStyle, position: 'absolute' }}
                    onMouseDown={(e) => {
                      const barEl = e.currentTarget.closest('[data-activity-bar]');
                      if (!barEl) return;
                      const container = document.querySelector('[data-timeline-body]');
                      if (!container) return;
                      const containerRect = container.getBoundingClientRect();
                      const dotRect = e.currentTarget.getBoundingClientRect();
                      const px = dotRect.left - containerRect.left + 4;
                      const py = dotRect.top - containerRect.top + 4;
                      onAnchorMouseDown(e, activity.id, side, { x: px, y: py });
                    }}
                  />
                );
              })}
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
        <ContextMenuItem onClick={handleConvertToActivity}>
          <RectangleHorizontal className="mr-2 h-3.5 w-3.5" />
          Convert to Activity
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
