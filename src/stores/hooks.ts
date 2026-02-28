import type { TemporalState } from 'zundo';
import { useStore } from './index';
import type { StoreState } from './index';

type PartializedState = Pick<StoreState, 'chart' | 'weeksChart'>;

export function useTemporalStore() {
  return useStore.temporal as unknown as {
    getState: () => TemporalState<PartializedState>;
  };
}

export function useUndo() {
  const temporal = useTemporalStore();
  return () => temporal.getState().undo();
}

export function useRedo() {
  const temporal = useTemporalStore();
  return () => temporal.getState().redo();
}
