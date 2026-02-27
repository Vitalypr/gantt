import { useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/stores';
import { autoSave } from '@/utils/persistence';
import type { GanttChart } from '@/types/gantt';

const AUTO_SAVE_INTERVAL = 30_000;
const DEBOUNCE_MS = 1_000;

export function useAutoSave() {
  const chart = useStore((s) => s.chart);
  const monthWidth = useStore((s) => s.monthWidth);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const rowSize = useStore((s) => s.rowSize);
  const showQuarters = useStore((s) => s.showQuarters);

  const chartWithSettings: GanttChart = useMemo(
    () => ({
      ...chart,
      viewSettings: { sidebarWidth, monthWidth, rowSize, showQuarters },
    }),
    [chart, monthWidth, sidebarWidth, rowSize, showQuarters],
  );

  const chartRef = useRef(chartWithSettings);
  chartRef.current = chartWithSettings;

  // Debounced save on chart or view settings changes
  useEffect(() => {
    const id = setTimeout(() => {
      autoSave(chartWithSettings);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [chartWithSettings]);

  // Also save on a 30-second interval as a safety net
  useEffect(() => {
    const id = setInterval(() => {
      autoSave(chartRef.current);
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // Save before the user leaves/refreshes the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      autoSave(chartRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
