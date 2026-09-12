import { useStore } from '@/stores';
import { localeForDirection } from '@/utils/i18n';

/**
 * The chart's reading direction and the locale that follows from it.
 *
 * One hook so no component re-derives `direction === 'rtl'` or picks its own locale — the
 * two must always agree, and a component that computes `isRtl` itself is a component that
 * will be missed when the rule changes.
 */
export function useChartDirection(): { direction: 'ltr' | 'rtl'; isRtl: boolean; locale: string } {
  const direction = useStore((s) => s.chartDirection);
  return { direction, isRtl: direction === 'rtl', locale: localeForDirection(direction) };
}
