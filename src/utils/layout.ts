import { ROW_HEIGHT } from '@/constants/timeline';
import type { TimelineMode } from '@/types/gantt';

/** Floor for the timeline body, so an empty chart is not a 0px sliver. */
export const MIN_BODY_HEIGHT = 300;

/**
 * Empty sidebar/canvas kept below the last row — the target for "double-click to add a row".
 *
 * One row-height, so it reads as the next row's slot. This band is the whole reason the
 * affordance works: the handler fires only when the pointer misses `[data-sidebar-row]`.
 * It used to exist only as a side effect of MIN_BODY_HEIGHT, so it disappeared as soon as
 * the rows grew past 300px — 8 rows at the default size — and adding rows by double-click
 * became impossible with no indication why.
 */
export const ADD_ROW_BAND = ROW_HEIGHT;

/**
 * Height of the timeline body row track.
 *
 * Deliberately independent of the viewport: `[data-gantt-grid]` is the snapshot capture
 * root, so any height beyond the content ships as blank space in the exported image.
 */
export function bodyHeightFor(totalRowHeight: number): number {
  return Math.max(totalRowHeight + ADD_ROW_BAND, MIN_BODY_HEIGHT);
}

/** Height of one header tier. */
export const TIER_HEIGHT = 28;

export type HeaderTierHeights = {
  /** Year band. */
  top: number;
  /** Quarter (months mode) or month (weeks mode); absent when months mode hides quarters. */
  middle?: number;
  /** The unit band — months or weeks. */
  unit: number;
};

/**
 * Per-tier header heights.
 *
 * A **named object**, not an array: under `noUncheckedIndexedAccess` an indexed read types as
 * `number | undefined`, and `style={{ height: undefined }}` compiles clean while silently
 * rendering an unsized tier.
 *
 * Tier heights depend on the mode and the quarter toggle only — never on unit width. Unit
 * width comes from a ResizeObserver, so a width-dependent tier height would reflow the whole
 * chart mid-drag.
 */
export function getHeaderTierHeights(
  mode: TimelineMode,
  showQuarters: boolean,
): HeaderTierHeights {
  // Weeks mode is always Year / Month / Week. Months mode is Year / [Quarter] / Month.
  if (mode === 'weeks') {
    return { top: TIER_HEIGHT, middle: TIER_HEIGHT, unit: TIER_HEIGHT };
  }
  return showQuarters
    ? { top: TIER_HEIGHT, middle: TIER_HEIGHT, unit: TIER_HEIGHT }
    : { top: TIER_HEIGHT, unit: TIER_HEIGHT };
}

/**
 * Total header height.
 *
 * `GanttChart` sizes its grid track with this; `TimelineHeader` styles each tier from
 * `getHeaderTierHeights`. Both reading from here is what stops the two files disagreeing —
 * they previously each counted tiers themselves, and adding the weeks-mode year band meant
 * editing the count in two places.
 */
export function getHeaderHeight(mode: TimelineMode, showQuarters: boolean): number {
  const t = getHeaderTierHeights(mode, showQuarters);
  return t.top + (t.middle ?? 0) + t.unit;
}
