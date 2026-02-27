import { useRef, useState, useEffect } from 'react';
import { MessageSquareText } from 'lucide-react';
import { useStore } from '@/stores';

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

  const [annotationValue, setAnnotationValue] = useState(annotation ?? '');
  const annotationRef = useRef<HTMLTextAreaElement>(null);

  const hasAnnotation = !!annotation;

  useEffect(() => {
    if (isOpen && annotationRef.current) {
      setAnnotationValue(annotation ?? '');
      annotationRef.current.focus();
    }
  }, [isOpen, annotation]);

  const commitAnnotation = () => {
    const trimmed = annotationValue.trim();
    updateActivity(activityId, { annotation: trimmed || undefined });
    onOpenChange(false);
  };

  return (
    <>
      {/* Annotation icon */}
      {hasAnnotation && !isEditing && (
        <button
          className={iconClassName ?? 'absolute top-0.5 left-0.5 z-10 flex h-3.5 w-3.5 items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity'}
          style={iconColorStyle}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MessageSquareText className={iconColorClassName ?? 'h-2.5 w-2.5'} />
        </button>
      )}

      {/* Annotation popover */}
      {isOpen && (
        <div
          className="absolute z-50 rounded-md border bg-popover p-2 shadow-lg"
          style={{ top: -4, left: 0, transform: 'translateY(-100%)', minWidth: 180, maxWidth: 260 }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={annotationRef}
            value={annotationValue}
            onChange={(e) => setAnnotationValue(e.target.value)}
            onBlur={commitAnnotation}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onOpenChange(false);
              } else if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitAnnotation();
              }
            }}
            placeholder="Add annotation..."
            className="w-full resize-none rounded border bg-background px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            rows={3}
          />
        </div>
      )}
    </>
  );
}
