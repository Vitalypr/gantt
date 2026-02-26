import type { StateCreator } from 'zustand';
import type { GanttChart, SavedChartEntry } from '@/types/gantt';
import * as persistence from '@/utils/persistence';

export type PersistenceSlice = {
  savedCharts: SavedChartEntry[];
  lastSavedAt: string | null;

  refreshSavedCharts: () => void;
  saveCurrentChart: () => void;
  loadSavedChart: (id: string) => void;
  deleteSavedChart: (id: string) => void;
  exportChart: () => void;
  importChart: () => Promise<boolean>;
};

export const createPersistenceSlice: StateCreator<
  PersistenceSlice & { chart: GanttChart; setChart: (chart: GanttChart) => void },
  [['zustand/immer', never]],
  [],
  PersistenceSlice
> = (set, get) => ({
  savedCharts: persistence.listSavedCharts(),
  lastSavedAt: null,

  refreshSavedCharts: () =>
    set((state) => {
      state.savedCharts = persistence.listSavedCharts();
    }),

  saveCurrentChart: () => {
    const chart = get().chart;
    persistence.saveChart(chart);
    set((state) => {
      state.lastSavedAt = new Date().toISOString();
      state.savedCharts = persistence.listSavedCharts();
    });
  },

  loadSavedChart: (id) => {
    const chart = persistence.loadChart(id);
    if (chart) {
      get().setChart(chart);
    }
  },

  deleteSavedChart: (id) => {
    persistence.deleteChart(id);
    set((state) => {
      state.savedCharts = persistence.listSavedCharts();
    });
  },

  exportChart: () => {
    const chart = get().chart;
    persistence.exportChartToFile(chart);
  },

  importChart: async () => {
    const chart = await persistence.importChartFromFile();
    if (chart) {
      get().setChart(chart);
      return true;
    }
    return false;
  },
});
