import { Fragment } from 'react';
import { ACTIVITY_COLOR_GROUPS, COLOR_TONES } from '@/constants/colors';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { Check, Ban } from 'lucide-react';

export type ColorTarget = {
  /** Tab label, e.g. "Fill". */
  label: string;
  /** The colour currently applied, or undefined when this target follows the theme. */
  current: string | undefined;
  onPick: (color: string) => void;
  /** Offer a "follow the theme" reset. Omit for a target that must always have a colour. */
  onReset?: () => void;
  resetLabel?: string;
};

type ColorPickerProps = {
  /** One entry per thing the swatches can paint. With two or more, a tab row picks between
   *  them — which is what keeps fill and frame from being two identical grids. */
  targets: ColorTarget[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

/**
 * The palette, laid out the way the data is shaped: one row per hue, one column per tone.
 *
 * The grid used to pack two hue groups into each row, which put four different lightnesses
 * side by side twice over and left nothing to scan down. Columns now mean one thing —
 * lightness — so picking "the same colour but darker" is a move down a known column.
 */
export function ColorPicker({ targets, activeIndex, onActiveIndexChange }: ColorPickerProps) {
  const active = targets[Math.min(activeIndex, targets.length - 1)]!;

  return (
    <div className="w-max max-h-[min(70vh,480px)] overflow-y-auto pr-1">
      {targets.length > 1 && (
        <div className="mb-1.5 flex gap-0.5 rounded-sm bg-muted p-0.5">
          {targets.map((t, i) => (
            <button
              key={t.label}
              className={cn(
                'flex-1 rounded-sm px-2 py-1 text-[11px] leading-none transition-colors',
                i === activeIndex
                  ? 'bg-background font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onActiveIndexChange(i)}
              aria-pressed={i === activeIndex}
            >
              {t.label}
              {/* The dot is what makes one grid serving two targets legible: each tab shows
                  what it currently holds without switching to it. */}
              <span
                className="ml-1.5 inline-block h-2 w-2 rounded-full border border-border align-middle"
                style={{ backgroundColor: t.current ?? 'transparent' }}
              />
            </button>
          ))}
        </div>
      )}

      {active.onReset && (
        <button
          className={cn(
            'mb-1.5 flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-xs',
            'hover:bg-accent focus-visible:bg-accent',
            active.current === undefined && 'bg-accent font-medium',
          )}
          onClick={active.onReset}
        >
          <Ban className="h-3 w-3 opacity-60" />
          {active.resetLabel ?? 'Default'}
          {active.current === undefined && <Check className="ml-auto h-3 w-3" />}
        </button>
      )}

      {/* ONE grid — hue names, tone headings and swatches all place into the same tracks.
          They were three separate flex stacks whose rows lined up only because their heights
          happened to match; a change to any one of them would have drifted the labels off
          their row with nothing to catch it. */}
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `auto repeat(${COLOR_TONES.length}, 1.25rem)` }}
        role="grid"
        aria-label="Activity colours by hue and tone"
      >
        <span />
        {COLOR_TONES.map((tone) => (
          <div
            key={tone}
            className="text-center text-[9px] leading-4 text-muted-foreground tabular-nums"
          >
            {tone}
          </div>
        ))}

        {ACTIVITY_COLOR_GROUPS.map((group) => (
          <Fragment key={group.name}>
            <div className="flex h-5 items-center pr-1 text-[9px] leading-none text-muted-foreground">
              {group.name}
            </div>
            {group.colors.map((color, toneIndex) => (
              <button
                key={color}
                aria-label={`${group.name} ${COLOR_TONES[toneIndex]}`}
                title={`${group.name} ${COLOR_TONES[toneIndex]}`}
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-sm border transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
                  active.current === color
                    ? 'border-foreground ring-1 ring-foreground/30'
                    : 'border-black/10 dark:border-white/10',
                )}
                style={{ backgroundColor: color }}
                onClick={() => active.onPick(color)}
              >
                {active.current === color && (
                  <Check
                    className="h-2.5 w-2.5"
                    style={{ color: isColorDark(color) ? '#fff' : '#0f172a' }}
                  />
                )}
              </button>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
