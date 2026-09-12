import {useEffect, useMemo} from 'react';
import { useStore } from '@/stores';
import { useShallow } from 'zustand/react/shallow';
import { autoSave, autoSaveWeeks } from '@/utils/persistence';
import type { MonthsChart, WeeksChart } from '@/types/gantt';
import { useLatest } from '@/hooks/useLatest';

const AUTO_SAVE_INTERVAL = 30_000;
const DEBOUNCE_MS = 1_000;

export function useAutoSave() {
  const chart = useStore((s) => s.chart);
  const weeksChart = useStore((s) => s.weeksChart);

  /**
   * Through the canonical helper, and reactively.
   *
   * A hand-rolled literal here is how `timelineMode`, `weekWidth` and the chart direction got
   * dropped on every reload. `useShallow` compares the produced object structurally, so this
   * re-runs when any view setting changes and re-renders only when one actually differs -
   * without a memo whose dependency list has to be kept in sync with the helper's fields by
   * hand, which is the same duplication in a new place.
   */
  const viewSettings = useStore(useShallow((s) => s.captureViewSettings()));

  const chartWithSettings: MonthsChart = useMemo(
    () => ({ ...chart, viewSettings }),
    [chart, viewSettings],
  );

  // Both charts carry the settings, so whichever one is reloaded restores the same view.
  const weeksChartCopy: WeeksChart = useMemo(
    () => ({ ...weeksChart, viewSettings }),
    [weeksChart, viewSettings],
  );

  const chartRef = useLatest(chartWithSettings);
  const weeksRef = useLatest(weeksChartCopy);

  // Debounced save on chart or view settings changes
  useEffect(() => {
    const id = setTimeout(() => {
      autoSave(chartWithSettings);
      autoSaveWeeks(weeksChartCopy);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [chartWithSettings, weeksChartCopy]);

  // Also save on a 30-second interval as a safety net
  useEffect(() => {
    const id = setInterval(() => {
      autoSave(chartRef.current);
      autoSaveWeeks(weeksRef.current);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Save before the user leaves/refreshes the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSave(chartRef.current);
      autoSaveWeeks(weeksRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
