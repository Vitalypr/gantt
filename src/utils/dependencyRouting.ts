import type { Activity, AnchorSide } from '@/types/gantt';
import { ROW_HEIGHT } from '@/constants/timeline';

type Point = { x: number; y: number };
type Rect = { left: number; top: number; width: number; height: number };

const BAR_PADDING_TOP = 4;
const STEP_OUT = 12;
const DETOUR_CLEARANCE = ROW_HEIGHT / 2; // route through the gap between rows

export function getActivityRect(
  activity: Activity,
  rowY: number,
  monthWidth: number,
  rowSpan = 1,
): Rect {
  if (activity.isMilestone) {
    const cx = activity.startMonth * monthWidth + monthWidth / 2;
    const cy = rowY + ROW_HEIGHT / 2;
    const size = 22;
    return {
      left: cx - size / 2,
      top: cy - size / 2,
      width: size,
      height: size,
    };
  }
  const spanHeight = ROW_HEIGHT * rowSpan - 8;
  return {
    left: activity.startMonth * monthWidth,
    top: rowY + BAR_PADDING_TOP,
    width: Math.max(activity.durationMonths * monthWidth, monthWidth * 0.5),
    height: spanHeight,
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
): Point[] {
  const a = stepOut(fromPt, fromSide);
  const b = stepOut(toPt, toSide);

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
