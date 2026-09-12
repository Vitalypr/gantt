import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export type ToastKind = 'success' | 'error';
export type ToastMessage = { kind: ToastKind; text: string } | null;

/**
 * One feedback channel.
 *
 * Replaces three that disagreed: a native `alert()` (which also fired when the user merely
 * cancelled a file picker), a bespoke green box with hardcoded colours that did not
 * re-theme, and silent failure.
 */
export function Toast({ message, onDismiss }: { message: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onDismiss, message.kind === 'error' ? 6000 : 2800);
    return () => clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md border px-3 py-2 text-label shadow-lg',
        message.kind === 'error'
          ? 'border-destructive/40 bg-destructive text-destructive-foreground'
          : 'border-border bg-popover text-popover-foreground',
      )}
    >
      {message.text}
    </div>
  );
}
