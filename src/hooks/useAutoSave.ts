import { useEffect, useRef } from 'react';
import { useStore } from '@/stores';
import { autoSave } from '@/utils/persistence';

const AUTO_SAVE_INTERVAL = 30_000;
const DEBOUNCE_MS = 1_000;

export function useAutoSave() {
  const chart = useStore((s) => s.chart);
  const chartRef = useRef(chart);
  chartRef.current = chart;

  // Debounced save on chart changes
  useEffect(() => {
    const id = setTimeout(() => {
      autoSave(chart);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [chart]);

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
