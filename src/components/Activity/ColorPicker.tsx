import { ACTIVITY_COLOR_GROUPS } from '@/constants/colors';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { Check, Ban } from 'lucide-react';

type ColorPickerProps = {
  currentColor: string | undefined;
  onColorChange: (color: string) => void;
  /** Offer a "follow the theme" reset — used by the frame-colour picker. */
  onReset?: () => void;
  resetLabel?: string;
};

export function ColorPicker({ currentColor, onColorChange, onReset, resetLabel }: ColorPickerProps) {
  return (
    <div>
      {onReset && (
        <button
          className={cn(
            'mb-1.5 flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-xs',
            'hover:bg-accent focus-visible:bg-accent',
            currentColor === undefined && 'bg-accent font-medium',
          )}
          onClick={onReset}
        >
          <Ban className="h-3 w-3 opacity-60" />
          {resetLabel ?? 'Default'}
          {currentColor === undefined && <Check className="ml-auto h-3 w-3" />}
        </button>
      )}
      {/* Two groups per row: 20 groups stacked singly would be a ~500px column inside a
          context submenu. Each group keeps its own row of four shades. */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {ACTIVITY_COLOR_GROUPS.map((group) => (
          <div key={group.name} className="flex items-center gap-1">
            {group.colors.map((color) => (
              <button
                key={color}
                aria-label={`${group.name} ${color}`}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-sm border transition-transform hover:scale-110',
                  currentColor === color ? 'border-foreground ring-1 ring-foreground/30' : 'border-transparent',
                )}
                style={{ backgroundColor: color }}
                onClick={() => onColorChange(color)}
                title={group.name}
              >
                {currentColor === color && (
                  <Check className="h-3 w-3" style={{ color: isColorDark(color) ? '#fff' : '#0f172a' }} />
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
