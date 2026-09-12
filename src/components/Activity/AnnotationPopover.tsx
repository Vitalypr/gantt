import { useRef, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useStore } from '@/stores';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

type AnnotationPopoverProps = {
  activityId: string;
  annotation: string | undefined;
  isEditing: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  iconClassName?: string;
  iconColorStyle?: React.CSSProperties;
  iconColorClassName?: string;
};

/**
 * Annotation editor, anchored to the bar and rendered in a portal.
 *
 * Two things this shape exists to prevent:
 *
 * 1. **Commit-on-blur closed it instantly.** Opening from the context menu means Radix is
 *    closing the menu and restoring focus to its trigger in the same tick, which blurred the
 *    textarea. A blur handler that also closed the popover therefore shut it before a key
 *    could be pressed — and wrote `annotation: undefined`, burning an undo entry. Commit is
 *    now tied to explicit intent (Enter, or dismissing the popover), never to raw focus loss.
 * 2. **It was clipped.** Rendered inline with `translateY(-100%)`, the editor for a bar on
 *    the first row fell outside `[data-gantt-scroll]`'s overflow box and was invisible. The
 *    portal puts it above the whole app.
 */
export function AnnotationPopover({
  activityId,
  annotation,
  isEditing,
  isOpen,
  onOpenChange,
  iconClassName,
  iconColorStyle,
  iconColorClassName,
}: AnnotationPopoverProps) {
  const updateActivity = useStore((s) => s.updateActivity);

  const [draft, setDraft] = useState(annotation ?? '');
  // Set while Escape unwinds, so the close handler knows not to save.
  const cancelledRef = useRef(false);

  const hasAnnotation = !!annotation;

  const commit = (value: string) => {
    const next = value.trim() || undefined;
    // No write when nothing changed — an unchanged commit would cost a Ctrl+Z press for an
    // edit the user never made.
    if (next !== annotation) {
      updateActivity(activityId, { annotation: next });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      cancelledRef.current = false;
      setDraft(annotation ?? '');
    } else if (!cancelledRef.current) {
      commit(draft);
    }
    onOpenChange(open);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <span className="absolute left-0 top-0 h-full w-full" style={{ pointerEvents: 'none' }} />
      </PopoverAnchor>

      {hasAnnotation && !isEditing && (
        <button
          aria-label="Edit annotation"
          title={annotation}
          className={iconClassName ?? 'absolute top-0.5 left-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity'}
          style={iconColorStyle}
          onClick={(e) => {
            e.stopPropagation();
            handleOpenChange(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MessageSquareText className={iconColorClassName ?? 'h-2.5 w-2.5'} />
        </button>
      )}

      <PopoverContent
        side="top"
        className="w-64"
        // Radix listens for Escape on `document` in the CAPTURE phase, so it dismisses —
        // and therefore commits — before any handler on the textarea can run. Marking the
        // cancel here is the only way to win that race; doing it in onKeyDown does not.
        onEscapeKeyDown={() => {
          cancelledRef.current = true;
        }}
        // The bar underneath must not treat this as a click on itself.
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => {
          // Focus the textarea ourselves; Radix would focus the content wrapper.
          e.preventDefault();
          const el = e.currentTarget as HTMLElement;
          el.querySelector('textarea')?.focus();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Keep global shortcuts (Delete, Ctrl+Z) out of the editor. Escape is handled
            // by onEscapeKeyDown above, which Radix fires before it dismisses.
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit(draft);
              onOpenChange(false);
            }
          }}
          placeholder="Add annotation… (Enter to save, Shift+Enter for a new line)"
          className="w-full resize-none rounded border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          rows={3}
        />
      </PopoverContent>
    </Popover>
  );
}
