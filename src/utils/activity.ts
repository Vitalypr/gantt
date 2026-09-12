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

/** How much of the status rail is filled, 0 to 1. */
export function statusFillFraction(status: ActivityStatus): number {
  switch (status) {
    case 'todo':
      return 0;
    case 'doing':
      return 0.5;
    case 'done':
      return 1;
  }
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
