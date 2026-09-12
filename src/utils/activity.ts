import type { Activity, ActivityStatus } from '@/types/gantt';
import { DEFAULT_BAR_FONT_SIZE, DEFAULT_MILESTONE_FONT_SIZE } from '@/constants/timeline';

/** The size a label falls back to when `Activity.fontSize` is unset. */
export function defaultFontSize(activity: Activity): number {
  return activity.isMilestone ? DEFAULT_MILESTONE_FONT_SIZE : DEFAULT_BAR_FONT_SIZE;
}

/** The size a label actually renders at. */
export function effectiveFontSize(activity: Activity): number {
  return activity.fontSize ?? defaultFontSize(activity);
}

/**
 * How much of the status rail is filled, 0 to 1 — or null for a status that is not drawn as a
 * rail at all. `'na'` is a hatch over the whole bar, so it has no rail and reserves no height.
 */
export function statusFillFraction(status: ActivityStatus): number | null {
  switch (status) {
    case 'na':
      return null;
    case 'todo':
      return 0;
    case 'doing':
      return 0.5;
    case 'done':
      return 1;
  }
}

/** True when this status is drawn as a rail, and so costs the label `STATUS_RAIL_RESERVE`. */
export function statusDrawsRail(status: ActivityStatus | undefined): boolean {
  return status !== undefined && statusFillFraction(status) !== null;
}

/**
 * Legacy `progress` (0-100) as a status.
 *
 * Charts saved before the field changed carry a number. `null` for anything unusable, so the
 * caller leaves the activity untracked rather than inventing a state for it.
 */
export function statusFromLegacyProgress(progress: unknown): ActivityStatus | null {
  if (typeof progress !== 'number' || !Number.isFinite(progress)) return null;
  if (progress <= 0) return 'todo';
  if (progress >= 100) return 'done';
  return 'doing';
}

/**
 * The properties the format painter carries. ONE list, so a new format field is either added
 * here — and picked up by copy, paste and the tests at once — or deliberately left out.
 */
export const FORMAT_FIELDS = ['color', 'outlineColor', 'labelColor', 'fontSize'] as const;

export type ActivityFormat = Pick<Activity, (typeof FORMAT_FIELDS)[number]>;

/** The format of `activity`, as the painter would copy it. */
export function formatOf(activity: Activity): ActivityFormat {
  return {
    color: activity.color,
    outlineColor: activity.outlineColor,
    labelColor: activity.labelColor,
    fontSize: activity.fontSize,
  };
}

/**
 * True when applying `format` would change `activity`.
 *
 * Undefined is a meaningful value for three of the four fields — "follow the theme", "follow
 * the fill", "the size for this kind" — so this compares with `in`-style equality rather than
 * treating a missing key as "no change".
 */
export function formatDiffers(activity: Activity, format: ActivityFormat): boolean {
  return FORMAT_FIELDS.some((f) => activity[f] !== format[f]);
}
