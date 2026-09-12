import { useCallback, useEffect, useRef, useState } from 'react';
import { Toolbar } from '@/components/Toolbar/Toolbar';
import { FindPanel } from '@/components/Toolbar/FindPanel';
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

  // Restore view settings from the auto-saved chart on first mount, through the canonical
  // helper. Restoring a hand-picked subset here is what dropped timelineMode, weekWidth and
  // the chart direction on every reload.
  useEffect(() => {
    const { chart, weeksChart, restoreViewSettings } = useStore.getState();
    const vs = chart.viewSettings ?? weeksChart.viewSettings;
    if (vs) restoreViewSettings(vs);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Toolbar />
      <div className="relative flex-1 overflow-hidden">
        <GanttChart />
        <FindPanel />
      </div>
      {showEasterEgg && <EasterEgg onDone={handleEasterEggDone} />}
    </div>
  );
}
