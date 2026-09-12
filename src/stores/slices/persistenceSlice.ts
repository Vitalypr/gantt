import type { StateCreator } from 'zustand';
import type { ChartDirection, MonthsChart, WeeksChart, SavedChartEntry, ViewSettings, TimelineMode } from '@/types/gantt';
import type { RowSize } from './uiSlice';
import * as persistence from '@/utils/persistence';

export type PersistenceSlice = {
  savedCharts: SavedChartEntry[];
  lastSavedAt: string | null;

  refreshSavedCharts: () => void;
  saveCurrentChart: () => void;
  loadSavedChart: (id: string) => void;
  deleteSavedChart: (id: string) => void;
  exportChart: () => Promise<void>;
  importChart: () => Promise<boolean>;

  /** The canonical view-settings pair. Nothing may hand-roll its own subset: when
   *  `useAutoSave` and `App` each wrote their own, reloads silently dropped fields. */
  captureViewSettings: () => ViewSettings;
  restoreViewSettings: (vs: ViewSettings) => void;
};

type PersistenceDeps = {
  chart: MonthsChart;
  weeksChart: WeeksChart;
  timelineMode: TimelineMode;
  setChart: (chart: MonthsChart) => void;
  setWeeksChart: (chart: WeeksChart) => void;
  monthWidth: number;
  weekWidth: number;
  sidebarWidth: number;
  rowSize: RowSize;
  showQuarters: boolean;
  setMonthWidth: (width: number) => void;
  setWeekWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setRowSize: (size: RowSize) => void;
  setShowQuarters: (show: boolean) => void;
  setTimelineMode: (mode: TimelineMode) => void;
  chartDirection: ChartDirection;
  setChartDirection: (direction: ChartDirection) => void;
  showLegend: boolean;
  showStatus: boolean;
  setShowLegend: (show: boolean) => void;
  // Cross-slice typing is a hand-written intersection and therefore unchecked — a setter
  // missing here fails at runtime, not at compile time.
  setShowStatus: (show: boolean) => void;
};

function snapshotViewSettings(state: PersistenceDeps): ViewSettings {
  return {
    sidebarWidth: state.sidebarWidth,
    monthWidth: state.monthWidth,
    weekWidth: state.weekWidth,
    rowSize: state.rowSize,
    showQuarters: state.showQuarters,
    timelineMode: state.timelineMode,
    chartDirection: state.chartDirection,
    showLegend: state.showLegend,
    showStatus: state.showStatus,
  };
}

function applyViewSettings(state: PersistenceDeps, vs: ViewSettings) {
  state.setMonthWidth(vs.monthWidth);
  state.setSidebarWidth(vs.sidebarWidth);
  state.setRowSize(vs.rowSize);
  state.setShowQuarters(vs.showQuarters);
  if (vs.weekWidth !== undefined) state.setWeekWidth(vs.weekWidth);
  if (vs.timelineMode) state.setTimelineMode(vs.timelineMode);
  if (vs.chartDirection) state.setChartDirection(vs.chartDirection);
  if (vs.showLegend !== undefined) state.setShowLegend(vs.showLegend);
  if (vs.showStatus !== undefined) state.setShowStatus(vs.showStatus);
}

export const createPersistenceSlice: StateCreator<
  PersistenceSlice & PersistenceDeps,
  [['zustand/immer', never]],
  [],
  PersistenceSlice
> = (set, get) => ({
  savedCharts: persistence.listSavedCharts(),
  lastSavedAt: null,

  captureViewSettings: () => snapshotViewSettings(get()),

  restoreViewSettings: (vs) => applyViewSettings(get(), vs),

  refreshSavedCharts: () =>
    set((state) => {
      state.savedCharts = persistence.listSavedCharts();
    }),

  saveCurrentChart: () => {
    const state = get();
    // Mode-aware. Reading `state.chart` unconditionally meant a weeks chart could never be
    // saved, and the toolbar reported success about a chart the user was not editing.
    const source = state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
    const chart = { ...source, viewSettings: snapshotViewSettings(state) };
    persistence.saveChart(chart, state.timelineMode);
    set((s) => {
      s.lastSavedAt = new Date().toISOString();
      s.savedCharts = persistence.listSavedCharts();
    });
  },

  loadSavedChart: (id) => {
    const chart = persistence.loadChart(id);
    if (!chart) return;
    const state = get();
    // View settings carry the mode, so apply them FIRST: they decide which chart the load
    // targets, and applying them afterwards would drop the chart into the wrong slot.
    if (chart.viewSettings) applyViewSettings(state, chart.viewSettings);
    // Narrowed on the discriminant, so the compiler proves the chart reaches the right slot.
    if (chart.unit === 'week') {
      get().setWeeksChart(chart);
      get().setTimelineMode('weeks');
    } else {
      get().setChart(chart);
      get().setTimelineMode('months');
    }
  },

  deleteSavedChart: (id) => {
    persistence.deleteChart(id);
    set((state) => {
      state.savedCharts = persistence.listSavedCharts();
    });
  },

  exportChart: async () => {
    const state = get();
    // Export the active chart (based on current mode)
    if (state.timelineMode === 'weeks') {
      const chart = { ...state.weeksChart, viewSettings: snapshotViewSettings(state) };
      await persistence.exportChartToFile(chart);
    } else {
      const chart = { ...state.chart, viewSettings: snapshotViewSettings(state) };
      await persistence.exportChartToFile(chart);
    }
  },

  importChart: async () => {
    const chart = await persistence.importChartFromFile();
    if (!chart) return false;
    // The file says which chart it is; the current mode does not get a vote, or importing a
    // weeks chart while in months mode would silently overwrite the wrong one.
    if (chart.unit === 'week') {
      get().setWeeksChart(chart);
      get().setTimelineMode('weeks');
    } else {
      get().setChart(chart);
      get().setTimelineMode('months');
    }
    if (chart.viewSettings) applyViewSettings(get(), chart.viewSettings);
    return true;
  },
});
