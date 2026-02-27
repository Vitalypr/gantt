import type { StateCreator } from 'zustand';
import type { GanttChart, SavedChartEntry, ViewSettings } from '@/types/gantt';
import type { RowSize } from './uiSlice';
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

type PersistenceDeps = {
  chart: GanttChart;
  setChart: (chart: GanttChart) => void;
  monthWidth: number;
  sidebarWidth: number;
  rowSize: RowSize;
  showQuarters: boolean;
  setMonthWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setRowSize: (size: RowSize) => void;
  setShowQuarters: (show: boolean) => void;
};

function snapshotViewSettings(state: PersistenceDeps): ViewSettings {
  return {
    sidebarWidth: state.sidebarWidth,
    monthWidth: state.monthWidth,
    rowSize: state.rowSize,
    showQuarters: state.showQuarters,
  };
}

function applyViewSettings(state: PersistenceDeps, vs: ViewSettings) {
  state.setMonthWidth(vs.monthWidth);
  state.setSidebarWidth(vs.sidebarWidth);
  state.setRowSize(vs.rowSize);
  state.setShowQuarters(vs.showQuarters);
}

export const createPersistenceSlice: StateCreator<
  PersistenceSlice & PersistenceDeps,
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
    const state = get();
    const chart = { ...state.chart, viewSettings: snapshotViewSettings(state) };
    persistence.saveChart(chart);
    set((s) => {
      s.lastSavedAt = new Date().toISOString();
      s.savedCharts = persistence.listSavedCharts();
    });
  },

  loadSavedChart: (id) => {
    const chart = persistence.loadChart(id);
    if (chart) {
      get().setChart(chart);
      if (chart.viewSettings) {
        applyViewSettings(get(), chart.viewSettings);
      }
    }
  },

  deleteSavedChart: (id) => {
    persistence.deleteChart(id);
    set((state) => {
      state.savedCharts = persistence.listSavedCharts();
    });
  },

  exportChart: () => {
    const state = get();
    const chart = { ...state.chart, viewSettings: snapshotViewSettings(state) };
    persistence.exportChartToFile(chart);
  },

  importChart: async () => {
    const chart = await persistence.importChartFromFile();
    if (chart) {
      get().setChart(chart);
      if (chart.viewSettings) {
        applyViewSettings(get(), chart.viewSettings);
      }
      return true;
    }
    return false;
  },
});
