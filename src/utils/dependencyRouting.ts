import type { Activity, AnchorSide } from '@/types/gantt';
import { unitSpanToLeft } from '@/utils/timeline';

type Point = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

const BAR_PADDING_TOP = 4;
const STEP_OUT = 12;

export type ActivityRectInput = {
  activity: Activity;
  rowY: number;
  unitWidth: number;
  totalUnits: number;
  isRtl: boolean;
  rowSpan?: number;
  rowHeight?: number;
};

/**
 * The box an activity is drawn in — the single description of activity geometry.
 *
 * A milestone is a one-unit bar with a heavy frame, not a diamond, so ONE computation
 * describes both shapes. When these were two, routing modelled a milestone as a
 * `round(rowHeight * 0.55)` square while the component drew a full unit-wide box — 22px
 * against 76px at default zoom — so arrows terminated well inside the shape and the snap
 * test probed where the anchor dot was not.
 *
 * `left` comes from `unitSpanToLeft`, so the box mirrors with the time axis in RTL.
 */
export function getActivityRect({
  activity,
  rowY,
  unitWidth,
  totalUnits,
  isRtl,
  rowSpan = 1,
  rowHeight = 40,
}: ActivityRectInput): Rect {
  const units = activity.isMilestone ? 1 : activity.durationMonths;
  const span = activity.isMilestone ? 1 : rowSpan;
  // A sub-unit bar still has to be grabbable, so its drawn width has a floor.
  const width = Math.max(units * unitWidth, unitWidth * 0.5);
  return {
    left: unitSpanToLeft(activity.startMonth, width / unitWidth, unitWidth, totalUnits, isRtl),
    top: rowY + BAR_PADDING_TOP,
    width,
    height: rowHeight * span - 8,
  };
}

export function getAnchorPoint(rect: Rect, side: AnchorSide): Point {
  switch (side) {
    case 'left':
      return { x: rect.left, y: rect.top + rect.height / 2 };
    case 'right':
      return { x: rect.left + rect.width, y: rect.top + rect.height / 2 };
    case 'top':
      return { x: rect.left + rect.width / 2, y: rect.top };
    case 'bottom':
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height };
  }
}

function stepOut(pt: Point, side: AnchorSide): Point {
  switch (side) {
    case 'left':
      return { x: pt.x - STEP_OUT, y: pt.y };
    case 'right':
      return { x: pt.x + STEP_OUT, y: pt.y };
    case 'top':
      return { x: pt.x, y: pt.y - STEP_OUT };
    case 'bottom':
      return { x: pt.x, y: pt.y + STEP_OUT };
  }
}

function isHorizontalSide(side: AnchorSide): boolean {
  return side === 'left' || side === 'right';
}

export function routeOrthogonal(
  fromPt: Point,
  fromSide: AnchorSide,
  toPt: Point,
  toSide: AnchorSide,
  rowHeight = 40,
): Point[] {
  const a = stepOut(fromPt, fromSide);
  const b = stepOut(toPt, toSide);
  const DETOUR_CLEARANCE = rowHeight / 2;

  const fromH = isHorizontalSide(fromSide);
  const toH = isHorizontalSide(toSide);

  // Both horizontal: Z/S-shape or U-detour for backward routing
  if (fromH && toH) {
    // Backward: step-out points face each other and cross → route around bars
    const isBackward =
      (fromSide === 'right' && toSide === 'left' && a.x >= b.x) ||
      (fromSide === 'left' && toSide === 'right' && a.x <= b.x);

    if (isBackward) {
      // Detour just past the source bar, toward the target
      const goBelow = toPt.y >= fromPt.y;
      const detourY = goBelow
        ? fromPt.y + DETOUR_CLEARANCE
        : fromPt.y - DETOUR_CLEARANCE;
      return [
        fromPt,
        a,
        { x: a.x, y: detourY },
        { x: b.x, y: detourY },
        b,
        toPt,
      ];
    }

    // Normal Z/S-shape via vertical midpoint
    const midX = (a.x + b.x) / 2;
    return [
      fromPt,
      a,
      { x: midX, y: a.y },
      { x: midX, y: b.y },
      b,
      toPt,
    ];
  }

  // Both vertical: horizontal midpoint or U-detour for backward routing
  if (!fromH && !toH) {
    const isBackward =
      (fromSide === 'bottom' && toSide === 'top' && a.y >= b.y) ||
      (fromSide === 'top' && toSide === 'bottom' && a.y <= b.y);

    if (isBackward) {
      // Detour just past the source bar, toward the target
      const goRight = toPt.x >= fromPt.x;
      const detourX = goRight
        ? fromPt.x + DETOUR_CLEARANCE
        : fromPt.x - DETOUR_CLEARANCE;
      return [
        fromPt,
        a,
        { x: detourX, y: a.y },
        { x: detourX, y: b.y },
        b,
        toPt,
      ];
    }

    const midY = (a.y + b.y) / 2;
    return [
      fromPt,
      a,
      { x: a.x, y: midY },
      { x: b.x, y: midY },
      b,
      toPt,
    ];
  }

  // Mixed: single corner
  if (fromH && !toH) {
    return [
      fromPt,
      a,
      { x: b.x, y: a.y },
      b,
      toPt,
    ];
  }

  // !fromH && toH
  return [
    fromPt,
    a,
    { x: a.x, y: b.y },
    b,
    toPt,
  ];
}

export function routeToMouse(
  fromPt: Point,
  fromSide: AnchorSide,
  mouseX: number,
  mouseY: number,
): Point[] {
  const a = stepOut(fromPt, fromSide);
  const fromH = isHorizontalSide(fromSide);

  if (fromH) {
    return [
      fromPt,
      a,
      { x: mouseX, y: a.y },
      { x: mouseX, y: mouseY },
    ];
  }

  return [
    fromPt,
    a,
    { x: a.x, y: mouseY },
    { x: mouseX, y: mouseY },
  ];
}

export function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
}
