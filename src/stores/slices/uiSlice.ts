import type { StateCreator } from 'zustand';
import {
  DEFAULT_MONTH_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_TOPIC_WIDTH,
  MIN_TOPIC_WIDTH,
  MAX_TOPIC_WIDTH,
  DEFAULT_WEEK_WIDTH,
  MIN_MONTH_WIDTH,
  MAX_MONTH_WIDTH,
  MIN_WEEK_WIDTH,
  MAX_WEEK_WIDTH,
  ZOOM_STEP,
} from '@/constants/timeline';
import type { ChartDirection, TimelineMode } from '@/types/gantt';

export type SelectedActivity = {
  activityId: string;
};

export type EditingActivity = {
  activityId: string;
};

export type SelectedDependency = {
  dependencyId: string;
};

export type RowSize = 'small' | 'medium' | 'large';

export type UiSlice = {
  monthWidth: number;
  effectiveMonthWidth: number;
  weekWidth: number;
  effectiveWeekWidth: number;
  sidebarWidth: number;
  /** Width of the sideways topic column, when any row carries a topic. */
  topicWidth: number;
  /** Selection is a SET: bulk recolour, bulk delete and range select all need more than
   *  one. Order is selection order, so the first entry is the anchor. */
  selectedActivityIds: string[];
  editingActivity: EditingActivity | null;
  selectedDependency: SelectedDependency | null;
  dependencyMode: boolean;
  showQuarters: boolean;
  rowSize: RowSize;
  timelineMode: TimelineMode;
  chartDirection: ChartDirection;
  /** Find-in-chart query; null means the panel is closed. */
  findQuery: string | null;
  showLegend: boolean;
  /** Master switch for every status rail on the canvas. */
  showStatus: boolean;

  zoomIn: () => void;
  zoomOut: () => void;
  setMonthWidth: (width: number) => void;
  setEffectiveMonthWidth: (width: number) => void;
  setWeekWidth: (width: number) => void;
  setEffectiveWeekWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  setTopicWidth: (width: number) => void;
  selectActivity: (selection: SelectedActivity | null) => void;
  toggleActivitySelection: (activityId: string) => void;
  selectActivities: (activityIds: string[]) => void;
  setEditingActivity: (editing: EditingActivity | null) => void;
  selectDependency: (selection: SelectedDependency | null) => void;
  setDependencyMode: (enabled: boolean) => void;
  setShowQuarters: (show: boolean) => void;
  setRowSize: (size: RowSize) => void;
  setTimelineMode: (mode: TimelineMode) => void;
  setChartDirection: (direction: ChartDirection) => void;
  toggleChartDirection: () => void;
  setFindQuery: (query: string | null) => void;
  setShowLegend: (show: boolean) => void;
  setShowStatus: (show: boolean) => void;
};

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], []> = (set) => ({
  monthWidth: DEFAULT_MONTH_WIDTH,
  effectiveMonthWidth: DEFAULT_MONTH_WIDTH,
  weekWidth: DEFAULT_WEEK_WIDTH,
  effectiveWeekWidth: DEFAULT_WEEK_WIDTH,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  topicWidth: DEFAULT_TOPIC_WIDTH,
  selectedActivityIds: [],
  editingActivity: null,
  selectedDependency: null,
  dependencyMode: false,
  showQuarters: true,
  rowSize: 'medium' as RowSize,
  timelineMode: 'months' as TimelineMode,
  chartDirection: 'ltr' as ChartDirection,
  findQuery: null as string | null,
  showLegend: false,
  showStatus: true,

  zoomIn: () =>
    set((state) => {
      if (state.timelineMode === 'weeks') {
        const step = state.weekWidth < 20 ? 2 : ZOOM_STEP;
        state.weekWidth = Math.min(MAX_WEEK_WIDTH, state.weekWidth + step);
      } else {
        const step = state.monthWidth < 20 ? 2 : ZOOM_STEP;
        state.monthWidth = Math.min(MAX_MONTH_WIDTH, state.monthWidth + step);
      }
    }),

  zoomOut: () =>
    set((state) => {
      if (state.timelineMode === 'weeks') {
        const step = state.weekWidth <= 20 ? 2 : ZOOM_STEP;
        state.weekWidth = Math.max(MIN_WEEK_WIDTH, state.weekWidth - step);
      } else {
        const step = state.monthWidth <= 20 ? 2 : ZOOM_STEP;
        state.monthWidth = Math.max(MIN_MONTH_WIDTH, state.monthWidth - step);
      }
    }),

  setMonthWidth: (width) =>
    set((state) => {
      state.monthWidth = Math.max(MIN_MONTH_WIDTH, Math.min(MAX_MONTH_WIDTH, width));
    }),

  setEffectiveMonthWidth: (width) =>
    set((state) => {
      state.effectiveMonthWidth = width;
    }),

  setWeekWidth: (width) =>
    set((state) => {
      state.weekWidth = Math.max(MIN_WEEK_WIDTH, Math.min(MAX_WEEK_WIDTH, width));
    }),

  setEffectiveWeekWidth: (width) =>
    set((state) => {
      state.effectiveWeekWidth = width;
    }),

  setSidebarWidth: (width) =>
    set((state) => {
      state.sidebarWidth = width;
    }),

  setTopicWidth: (width) =>
    set((state) => {
      state.topicWidth = Math.max(MIN_TOPIC_WIDTH, Math.min(MAX_TOPIC_WIDTH, width));
    }),

  selectActivity: (selection) =>
    set((state) => {
      state.selectedActivityIds = selection ? [selection.activityId] : [];
      if (selection) state.selectedDependency = null;
    }),

  toggleActivitySelection: (activityId) =>
    set((state) => {
      const i = state.selectedActivityIds.indexOf(activityId);
      if (i >= 0) {
        state.selectedActivityIds.splice(i, 1);
      } else {
        state.selectedActivityIds.push(activityId);
        state.selectedDependency = null;
      }
    }),

  selectActivities: (activityIds) =>
    set((state) => {
      state.selectedActivityIds = [...new Set(activityIds)];
      if (state.selectedActivityIds.length > 0) state.selectedDependency = null;
    }),

  setEditingActivity: (editing) =>
    set((state) => {
      state.editingActivity = editing;
    }),

  selectDependency: (selection) =>
    set((state) => {
      state.selectedDependency = selection;
      if (selection) {
        state.selectedActivityIds = [];
        state.editingActivity = null;
      }
    }),

  setDependencyMode: (enabled) =>
    set((state) => {
      state.dependencyMode = enabled;
    }),

  setShowQuarters: (show) =>
    set((state) => {
      state.showQuarters = show;
    }),

  setRowSize: (size) =>
    set((state) => {
      state.rowSize = size;
    }),

  setShowLegend: (show) =>
    set((state) => {
      state.showLegend = show;
    }),

  setShowStatus: (show) =>
    set((state) => {
      state.showStatus = show;
    }),

  setFindQuery: (query) =>
    set((state) => {
      state.findQuery = query;
    }),

  setChartDirection: (direction) =>
    set((state) => {
      state.chartDirection = direction;
    }),

  toggleChartDirection: () =>
    set((state) => {
      state.chartDirection = state.chartDirection === 'rtl' ? 'ltr' : 'rtl';
    }),

  setTimelineMode: (mode) =>
    set((state) => {
      state.timelineMode = mode;
      // Clear selection when switching modes
      state.selectedActivityIds = [];
      state.editingActivity = null;
      state.selectedDependency = null;
    }),
});
