import type { Activity } from '@/types/gantt';
import { DEFAULT_BAR_FONT_SIZE, DEFAULT_MILESTONE_FONT_SIZE } from '@/constants/timeline';

/** The size a label falls back to when `Activity.fontSize` is unset. */
export function defaultFontSize(activity: Activity): number {
  return activity.isMilestone ? DEFAULT_MILESTONE_FONT_SIZE : DEFAULT_BAR_FONT_SIZE;
}

/** The size a label actually renders at. */
export function effectiveFontSize(activity: Activity): number {
  return activity.fontSize ?? defaultFontSize(activity);
}
