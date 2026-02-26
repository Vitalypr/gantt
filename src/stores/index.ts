import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { createChartSlice, type ChartSlice } from './slices/chartSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createPersistenceSlice, type PersistenceSlice } from './slices/persistenceSlice';

export type StoreState = ChartSlice & UiSlice & PersistenceSlice;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArgs = [any, any, any];

export const useStore = create<StoreState>()(
  temporal(
    immer<StoreState>((set, get, store) => ({
      ...createChartSlice(...([set, get, store] as unknown as AnyArgs)),
      ...createUiSlice(...([set, get, store] as unknown as AnyArgs)),
      ...createPersistenceSlice(...([set, get, store] as unknown as AnyArgs)),
    })),
    {
      partialize: (state) => ({
        chart: state.chart,
      }),
      limit: 50,
      equality: (pastState, currentState) => {
        const past = pastState as Record<string, unknown>;
        const curr = currentState as Record<string, unknown>;
        return past['chart'] === curr['chart'];
      },
    },
  ),
);
