import type { StateCreator } from 'zustand';
import {
  DEFAULT_MONTH_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_WEEK_WIDTH,
  MIN_MONTH_WIDTH,
  MAX_MONTH_WIDTH,
  MIN_WEEK_WIDTH,
  MAX_WEEK_WIDTH,
  ZOOM_STEP,
} from '@/constants/timeline';
import type { TimelineMode } from '@/types/gantt';

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
  selectedActivity: SelectedActivity | null;
  editingActivity: EditingActivity | null;
  selectedDependency: SelectedDependency | null;
  dependencyMode: boolean;
  showQuarters: boolean;
  rowSize: RowSize;
  timelineMode: TimelineMode;

  zoomIn: () => void;
  zoomOut: () => void;
  setMonthWidth: (width: number) => void;
  setEffectiveMonthWidth: (width: number) => void;
  setWeekWidth: (width: number) => void;
  setEffectiveWeekWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  selectActivity: (selection: SelectedActivity | null) => void;
  setEditingActivity: (editing: EditingActivity | null) => void;
  selectDependency: (selection: SelectedDependency | null) => void;
  setDependencyMode: (enabled: boolean) => void;
  setShowQuarters: (show: boolean) => void;
  setRowSize: (size: RowSize) => void;
  setTimelineMode: (mode: TimelineMode) => void;
};

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], []> = (set) => ({
  monthWidth: DEFAULT_MONTH_WIDTH,
  effectiveMonthWidth: DEFAULT_MONTH_WIDTH,
  weekWidth: DEFAULT_WEEK_WIDTH,
  effectiveWeekWidth: DEFAULT_WEEK_WIDTH,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  selectedActivity: null,
  editingActivity: null,
  selectedDependency: null,
  dependencyMode: false,
  showQuarters: true,
  rowSize: 'medium' as RowSize,
  timelineMode: 'months' as TimelineMode,

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

  selectActivity: (selection) =>
    set((state) => {
      state.selectedActivity = selection;
      if (selection) state.selectedDependency = null;
    }),

  setEditingActivity: (editing) =>
    set((state) => {
      state.editingActivity = editing;
    }),

  selectDependency: (selection) =>
    set((state) => {
      state.selectedDependency = selection;
      if (selection) {
        state.selectedActivity = null;
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

  setTimelineMode: (mode) =>
    set((state) => {
      state.timelineMode = mode;
      // Clear selection when switching modes
      state.selectedActivity = null;
      state.editingActivity = null;
      state.selectedDependency = null;
    }),
});
