import { useCallback, useRef } from 'react';
import { DOUBLE_TAP_DELAY, DOUBLE_TAP_DISTANCE } from '@/constants/timeline';

type LastTap = { time: number; x: number; y: number; key: string };

/**
 * Detects double-tap gestures for touch devices (where dblclick doesn't fire).
 * Returns a `checkDoubleTap` function to call inside onPointerDown handlers.
 * `key` scopes the double-tap so taps on different targets don't pair up.
 */
export function useDoubleTap() {
  const lastTapRef = useRef<LastTap>({ time: 0, x: 0, y: 0, key: '' });

  // Memoised so it is genuinely stable. It used to be a fresh function each render, which
  // every caller then omitted from its dependency array — harmless only because the one thing
  // it captures is a ref. "Harmless by accident" is what this bug class hides behind.
  const checkDoubleTap = useCallback((
    e: PointerEvent | React.PointerEvent,
    key = '',
  ): boolean => {
    // A mouse already produces a native `dblclick`, and every call site handles that too.
    // Answering true here as well runs the action twice — which added two sidebar rows for
    // any double-click faster than DOUBLE_TAP_DELAY (300ms), while a slower one inside the
    // OS window (500ms) added one. That gap is why the bug looked intermittent.
    if (e.pointerType === 'mouse') return false;

    const now = Date.now();
    const last = lastTapRef.current;
    const isDouble =
      now - last.time < DOUBLE_TAP_DELAY &&
      last.key === key &&
      Math.abs(e.clientX - last.x) < DOUBLE_TAP_DISTANCE &&
      Math.abs(e.clientY - last.y) < DOUBLE_TAP_DISTANCE;

    if (isDouble) {
      lastTapRef.current = { time: 0, x: 0, y: 0, key: '' };
    } else {
      lastTapRef.current = { time: now, x: e.clientX, y: e.clientY, key };
    }

    return isDouble;
  }, []);

  return checkDoubleTap;
}
