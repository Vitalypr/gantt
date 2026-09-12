import { useEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the most recent value, synced in an effect.
 *
 * Drag hooks install pointer handlers once, in a `useCallback`, but must read values that
 * change mid-gesture — unit width, row height, the row layout. Reading them from the closure
 * gives the value from the render that created the handler; writing `ref.current = value` in
 * the component body is unsafe under StrictMode and concurrent rendering, and is what
 * `react-hooks/refs` flags.
 *
 * Syncing in an effect is correct for this use because pointer handlers run after commit,
 * never during render. Do not read one of these *during* render — it lags by a commit there,
 * which is exactly the guarantee that makes it safe everywhere else.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
