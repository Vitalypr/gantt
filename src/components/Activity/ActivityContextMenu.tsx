import {
  Diamond,
  MessageSquareText,
  Palette,
  Pencil,
  RectangleHorizontal,
  Trash2,
  Type,
  CircleDot,
} from 'lucide-react';
import type { Activity, ActivityStatus } from '@/types/gantt';
import { FONT_SIZE_STEPS, stepFontSize } from '@/constants/timeline';
import { defaultFontSize, effectiveFontSize, statusFillFraction } from '@/utils/activity';
import { useStore } from '@/stores';
import { useState } from 'react';
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
/**
 * Discrete states, not a percentage: this is a drawing tool, not a tracker, and a slider
 * would imply a precision it does not model. `undefined` is a real choice, not a gap — it
 * means the activity is not tracked, and its bar draws exactly as it did before statuses
 * existed.
 */
const STATUS_CHOICES: { value: ActivityStatus | undefined; label: string }[] = [
  { value: undefined, label: 'No status' },
  { value: 'na', label: 'Not relevant' },
  { value: 'todo', label: 'Not started' },
  { value: 'doing', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export function ActivityContextMenu({
  activity,
  onRename,
  onAnnotate,
  children,
}: ActivityContextMenuProps) {
  const updateActivity = useStore((s) => s.updateActivity);
  const removeActivity = useStore((s) => s.removeActivity);
  const selectActivity = useStore((s) => s.selectActivity);

  const [colorTarget, setColorTarget] = useState(0);

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

        {/* ONE palette. Fill and frame were two submenus rendering the same grid, so the
            whole palette had to be scanned twice to answer "which one am I looking at". */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Palette className="mr-2 h-3.5 w-3.5" />
            Colour
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="p-2">
            <ColorPicker
              activeIndex={colorTarget}
              onActiveIndexChange={setColorTarget}
              targets={[
                {
                  label: 'Fill',
                  current: activity.color,
                  onPick: (color) => updateActivity(activity.id, { color }),
                },
                {
                  label: 'Frame',
                  current: activity.outlineColor,
                  onPick: (outlineColor) => updateActivity(activity.id, { outlineColor }),
                  onReset: () => updateActivity(activity.id, { outlineColor: undefined }),
                  resetLabel: 'Default (grey)',
                },
              ]}
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

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CircleDot className="mr-2 h-3.5 w-3.5" />
            Status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {STATUS_CHOICES.map((choice) => (
              <ContextMenuItem
                key={choice.label}
                onClick={() => updateActivity(activity.id, { status: choice.value })}
              >
                <StatusSwatch status={choice.value} />
                <span className="flex-1">{choice.label}</span>
                {activity.status === choice.value && <Check className="ml-2 h-3.5 w-3.5" />}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

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

/** The mark, at menu scale, so the list shows what it draws rather than describing it. */
function StatusSwatch({ status }: { status: ActivityStatus | undefined }) {
  if (status === undefined) {
    return <span className="mr-2 h-2.5 w-6 shrink-0 rounded-sm border border-dashed border-current opacity-30" />;
  }

  const fraction = statusFillFraction(status);
  if (fraction === null) {
    return (
      <span
        className="mr-2 h-2.5 w-6 shrink-0 rounded-sm border border-current/30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, currentColor 0 1px, transparent 1px 4px)',
        }}
      />
    );
  }

  return (
    <span className="mr-2 flex h-2.5 w-6 shrink-0 items-center">
      <span className="h-1 w-full overflow-hidden rounded-full bg-current/30">
        <span
          className="block h-full rounded-full bg-current"
          style={{ width: `${fraction * 100}%` }}
        />
      </span>
    </span>
  );
}
