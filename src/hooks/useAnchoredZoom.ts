import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useStore } from '@/stores';

/**
 * Zoom that keeps a chosen point fixed.
 *
 * Blind zoom changes the unit width and leaves `scrollLeft` alone, so content slides out from
 * under the cursor and the user has to re-find what they were looking at after every step.
 *
 * The correction spans two renders - which unit is under the anchor must be measured BEFORE
 * the width changes and restored after - so it lives here rather than at each call site. It
 * also compensates zoom from ANY source: the wheel passes an explicit anchor, and anything
 * else (the toolbar buttons, fit-to-view, a row-size change that alters the fit floor) falls
 * back to the viewport centre, which is tracked continuously so it is never stale.
 */
export function useAnchoredZoom(scrollRef: RefObject<HTMLDivElement | null>, unitWidth: number) {
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);

  /** Explicit anchor for the next width change: the unit, and where it sits in the viewport. */
  const pending = useRef<{ unit: number; offsetX: number } | null>(null);
  /** The unit under the viewport centre, kept current so a button press has an anchor too. */
  const centreUnit = useRef(0);
  const lastWidth = useRef(unitWidth);

  const measure = useCallback(
    (clientX: number | null) => {
      const el = scrollRef.current;
      const body = document.querySelector('[data-timeline-body]');
      if (!el || !body) return null;
      const elRect = el.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const anchorX = clientX ?? elRect.left + elRect.width / 2;
      return { unit: (anchorX - bodyRect.left) / unitWidth, offsetX: anchorX - elRect.left };
    },
    [scrollRef, unitWidth],
  );

  // Track the centre continuously; a stale value would scroll to wherever the user last was.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const m = measure(null);
      if (m) centreUnit.current = m.unit;
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [scrollRef, measure]);

  // After the new width is laid out but before paint, so there is no visible jump.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const body = document.querySelector('[data-timeline-body]');
    const changed = lastWidth.current !== unitWidth;
    lastWidth.current = unitWidth;
    if (!el || !body || !changed) {
      pending.current = null;
      return;
    }

    const anchor = pending.current ?? { unit: centreUnit.current, offsetX: el.clientWidth / 2 };
    pending.current = null;

    const elRect = el.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    const unitX = bodyRect.left - elRect.left + el.scrollLeft + anchor.unit * unitWidth;
    el.scrollLeft = unitX - anchor.offsetX;
  }, [unitWidth, scrollRef]);

  const zoomAt = useCallback(
    (direction: 1 | -1, clientX: number | null) => {
      pending.current = measure(clientX);
      if (direction > 0) zoomIn();
      else zoomOut();
    },
    [measure, zoomIn, zoomOut],
  );

  return { zoomAt };
}
