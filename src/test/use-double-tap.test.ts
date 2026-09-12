import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDoubleTap } from '@/hooks/useDoubleTap';

type Ptr = { pointerType: string; clientX: number; clientY: number };
const tap = (pointerType: string, x = 0, y = 0): Ptr => ({ pointerType, clientX: x, clientY: y });

/**
 * A mouse double-click also fires a native `dblclick`. Every call site pairs the two, so a
 * hook that answers true for a mouse makes the action run twice — which is how
 * double-clicking the sidebar added two rows, but only when the two clicks landed inside
 * DOUBLE_TAP_DELAY (300ms), well under the OS double-click window (500ms).
 */
describe('useDoubleTap', () => {
  it('never reports a double tap for a mouse — dblclick owns that', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('mouse') as never)).toBe(false);
    expect(result.current(tap('mouse') as never)).toBe(false);
    expect(result.current(tap('mouse') as never)).toBe(false);
  });

  it('reports a double tap for touch', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('touch') as never)).toBe(false);
    expect(result.current(tap('touch') as never)).toBe(true);
  });

  it('reports a double tap for pen', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('pen') as never)).toBe(false);
    expect(result.current(tap('pen') as never)).toBe(true);
  });

  it('does not pair taps that are far apart', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('touch', 0, 0) as never)).toBe(false);
    expect(result.current(tap('touch', 200, 0) as never)).toBe(false);
  });

  it('does not pair taps with different keys', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('touch') as never, 'row-a')).toBe(false);
    expect(result.current(tap('touch') as never, 'row-b')).toBe(false);
  });

  it('consumes the pair, so a third tap starts over', () => {
    const { result } = renderHook(() => useDoubleTap());
    expect(result.current(tap('touch') as never)).toBe(false);
    expect(result.current(tap('touch') as never)).toBe(true);
    expect(result.current(tap('touch') as never)).toBe(false);
  });
});
