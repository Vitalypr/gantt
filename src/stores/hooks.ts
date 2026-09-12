import { useCallback } from 'react';
import type { TemporalState } from 'zundo';
import { useStore } from './index';
import type { StoreState } from './index';

type PartializedState = Pick<StoreState, 'chart' | 'weeksChart'>;
type Temporal = TemporalState<PartializedState>;

export function useTemporalStore() {
  return useStore.temporal as unknown as {
    getState: () => Temporal;
    subscribe: (listener: () => void) => () => void;
  };
}

/**
 * Selection lives OUTSIDE undo history (`partialize` keeps only the two charts), so a step
 * that removes an activity leaves `selectedActivity` / `editingActivity` pointing at an id
 * that no longer exists. Every undo and redo funnels through here, which makes this the one
 * place to reconcile them — cheaper and more predictable than a store-wide subscription that
 * would run on every drag commit.
 */
function dropDanglingSelection() {
  const state = useStore.getState();
  const chart = state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
  const exists = (id: string) => chart.activities.some((a) => a.id === id);

  const live = state.selectedActivityIds.filter(exists);
  if (live.length !== state.selectedActivityIds.length) {
    state.selectActivities(live);
  }
  if (state.editingActivity && !exists(state.editingActivity.activityId)) {
    state.setEditingActivity(null);
  }
  if (
    state.selectedDependency &&
    !chart.dependencies.some((d) => d.id === state.selectedDependency!.dependencyId)
  ) {
    state.selectDependency(null);
  }
}

export function useUndo() {
  const temporal = useTemporalStore();
  // Memoised: an unmemoised closure re-binds the global keydown listener on every render.
  return useCallback(() => {
    temporal.getState().undo();
    dropDanglingSelection();
  }, [temporal]);
}

export function useRedo() {
  const temporal = useTemporalStore();
  return useCallback(() => {
    temporal.getState().redo();
    dropDanglingSelection();
  }, [temporal]);
}

/** Drives the disabled state of the toolbar buttons, so an exhausted history is visible. */
export function useCanUndo(): boolean {
  return useStore((s) => {
    void s.chart;
    void s.weeksChart;
    return useStore.temporal.getState().pastStates.length > 0;
  });
}

export function useCanRedo(): boolean {
  return useStore((s) => {
    void s.chart;
    void s.weeksChart;
    return useStore.temporal.getState().futureStates.length > 0;
  });
}
