import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { GanttChart } from '@/components/GanttChart/GanttChart';
import { EasterEgg } from '@/components/EasterEgg';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useStore } from '@/stores';

const EASTER_EGG_TRIGGER = 'everything works';

function useEasterEgg() {
  const [show, setShow] = useState(false);
  const prevNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to store changes directly for reliable detection
    const unsub = useStore.subscribe((state) => {
      const currentNames = new Set(
        state.chart.activities.map((a) => a.name.toLowerCase()),
      );
      const hadTrigger = prevNamesRef.current.has(EASTER_EGG_TRIGGER);
      const hasTrigger = currentNames.has(EASTER_EGG_TRIGGER);
      if (!hadTrigger && hasTrigger) {
        setShow(true);
      }
      prevNamesRef.current = currentNames;
    });
    // Initialize with current state
    const names = useStore.getState().chart.activities.map((a) => a.name.toLowerCase());
    prevNamesRef.current = new Set(names);
    return unsub;
  }, []);

  const handleDone = useCallback(() => setShow(false), []);
  return { show, handleDone };
}

export function App() {
  useKeyboardShortcuts();
  useAutoSave();
  const { show: showEasterEgg, handleDone: handleEasterEggDone } = useEasterEgg();

  // Restore view settings from auto-saved chart on initial mount
  useEffect(() => {
    const { chart, setMonthWidth, setSidebarWidth, setRowSize, setShowQuarters } = useStore.getState();
    if (chart.viewSettings) {
      setMonthWidth(chart.viewSettings.monthWidth);
      setSidebarWidth(chart.viewSettings.sidebarWidth);
      setRowSize(chart.viewSettings.rowSize);
      setShowQuarters(chart.viewSettings.showQuarters);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <GanttChart />
      </div>
      {showEasterEgg && <EasterEgg onDone={handleEasterEggDone} />}
    </div>
  );
}
