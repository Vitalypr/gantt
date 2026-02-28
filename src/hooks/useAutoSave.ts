import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/stores';
import { autoSave, autoSaveWeeks } from '@/utils/persistence';
import type { GanttChart, WeeksChart } from '@/types/gantt';

const AUTO_SAVE_INTERVAL = 30_000;
const DEBOUNCE_MS = 1_000;

export function useAutoSave() {
  const chart = useStore((s) => s.chart);
  const weeksChart = useStore((s) => s.weeksChart);
  const monthWidth = useStore((s) => s.monthWidth);
  const weekWidth = useStore((s) => s.weekWidth);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const rowSize = useStore((s) => s.rowSize);
  const showQuarters = useStore((s) => s.showQuarters);
  const timelineMode = useStore((s) => s.timelineMode);

  const chartWithSettings: GanttChart = useMemo(
    () => ({
      ...chart,
      viewSettings: { sidebarWidth, monthWidth, weekWidth, rowSize, showQuarters, timelineMode },
    }),
    [chart, monthWidth, weekWidth, sidebarWidth, rowSize, showQuarters, timelineMode],
  );

  const weeksChartCopy: WeeksChart = useMemo(
    () => ({ ...weeksChart }),
    [weeksChart],
  );

  const chartRef = useRef(chartWithSettings);
  chartRef.current = chartWithSettings;
  const weeksRef = useRef(weeksChartCopy);
  weeksRef.current = weeksChartCopy;

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
