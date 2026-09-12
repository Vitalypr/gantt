import {
  Diamond,
  MessageSquareText,
  Palette,
  Pencil,
  RectangleHorizontal,
  Square,
  Trash2,
  Type,
  Percent,
} from 'lucide-react';
import type { Activity } from '@/types/gantt';
import { FONT_SIZE_STEPS, stepFontSize } from '@/constants/timeline';
import { defaultFontSize, effectiveFontSize } from '@/utils/activity';
import { useStore } from '@/stores';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
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

type ActivityContextMenuProps = {
  activity: Activity;
  onRename: () => void;
  onAnnotate: () => void;
  children: React.ReactNode;
};

/**
 * One menu for bars and milestones.
 *
 * They render very differently but behave identically, and when the two menus were written
 * separately an action added to one silently did not exist on the other.
 */
/** Coarse steps: this is a drawing tool, not a tracker; a slider would imply precision. */
const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

export function ActivityContextMenu({
  activity,
  onRename,
  onAnnotate,
  children,
}: ActivityContextMenuProps) {
  const updateActivity = useStore((s) => s.updateActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const selectActivity = useStore((s) => s.selectActivity);

  const size = effectiveFontSize(activity);
  const atSmallest = size <= FONT_SIZE_STEPS[0]!;
  const atLargest = size >= FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1]!;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Rename
        </ContextMenuItem>

        <ContextMenuItem onClick={onAnnotate}>
          <MessageSquareText className="mr-2 h-3.5 w-3.5" />
          {activity.annotation ? 'Edit Annotation' : 'Add Annotation'}
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Palette className="mr-2 h-3.5 w-3.5" />
            Fill Colour
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorPicker
              currentColor={activity.color}
              onColorChange={(color) => updateActivity(activity.id, { color })}
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Square className="mr-2 h-3.5 w-3.5" />
            Frame Colour
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorPicker
              currentColor={activity.outlineColor}
              onColorChange={(outlineColor) => updateActivity(activity.id, { outlineColor })}
              onReset={() => updateActivity(activity.id, { outlineColor: undefined })}
              resetLabel="Default (grey)"
            />
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Type className="mr-2 h-3.5 w-3.5" />
            Font Size
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem
              disabled={atLargest}
              onClick={() => updateActivity(activity.id, { fontSize: stepFontSize(size, 1) })}
            >
              <Type className="mr-2 h-4 w-4" />
              Larger
            </ContextMenuItem>
            <ContextMenuItem
              disabled={atSmallest}
              onClick={() => updateActivity(activity.id, { fontSize: stepFontSize(size, -1) })}
            >
              <Type className="mr-2 h-3 w-3" />
              Smaller
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={activity.fontSize === undefined}
              onClick={() => updateActivity(activity.id, { fontSize: undefined })}
            >
              Reset ({defaultFontSize(activity)}px)
            </ContextMenuItem>
            <ContextMenuSeparator />
            <div className="px-2 py-1 text-[11px] text-muted-foreground tabular-nums">
              Current: {size}px
            </div>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {!activity.isMilestone && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Percent className="mr-2 h-3.5 w-3.5" />
              Progress
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {PROGRESS_STEPS.map((pct) => (
                <ContextMenuItem
                  key={pct}
                  onClick={() =>
                    updateActivity(activity.id, { progress: pct === 0 ? undefined : pct })
                  }
                >
                  <span className="mr-2 w-8 tabular-nums text-right">{pct}%</span>
                  {(activity.progress ?? 0) === pct && <Check className="h-3.5 w-3.5" />}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />

        {activity.isMilestone ? (
          <ContextMenuItem
            onClick={() => updateActivity(activity.id, { isMilestone: false })}
          >
            <RectangleHorizontal className="mr-2 h-3.5 w-3.5" />
            Convert to Activity
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onClick={() =>
              updateActivity(activity.id, { isMilestone: true, durationMonths: 1 })
            }
          >
            <Diamond className="mr-2 h-3.5 w-3.5" />
            Convert to Milestone
          </ContextMenuItem>
        )}

        <ContextMenuSeparator />

        <ContextMenuItem
          className={cn('text-destructive')}
          onClick={() => {
            removeActivity(activity.id);
            selectActivity(null);
          }}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
