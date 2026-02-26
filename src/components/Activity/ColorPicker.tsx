import { ACTIVITY_COLOR_GROUPS } from '@/constants/colors';
import { cn } from '@/lib/utils';
import { isColorDark } from '@/utils/color';
import { Check } from 'lucide-react';

type ColorPickerProps = {
  currentColor: string;
  onColorChange: (color: string) => void;
};

export function ColorPicker({ currentColor, onColorChange }: ColorPickerProps) {
  return (
    <div className="space-y-1">
      {ACTIVITY_COLOR_GROUPS.map((group) => (
        <div key={group.name} className="flex items-center gap-1">
          {group.colors.map((color) => (
            <button
              key={color}
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
  );
}
