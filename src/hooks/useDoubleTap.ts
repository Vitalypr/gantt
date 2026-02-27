import { useRef } from 'react';
import { DOUBLE_TAP_DELAY, DOUBLE_TAP_DISTANCE } from '@/constants/timeline';

type LastTap = { time: number; x: number; y: number; key: string };

/**
 * Detects double-tap gestures for touch devices (where dblclick doesn't fire).
 * Returns a `checkDoubleTap` function to call inside onPointerDown handlers.
 * `key` scopes the double-tap so taps on different targets don't pair up.
 */
export function useDoubleTap() {
  const lastTapRef = useRef<LastTap>({ time: 0, x: 0, y: 0, key: '' });

  const checkDoubleTap = (
    e: PointerEvent | React.PointerEvent,
    key = '',
  ): boolean => {
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
  };

  return checkDoubleTap;
}
