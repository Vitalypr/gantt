import type { StateCreator } from 'zustand';
import { DEFAULT_MONTH_WIDTH, DEFAULT_SIDEBAR_WIDTH, MIN_MONTH_WIDTH, MAX_MONTH_WIDTH, ZOOM_STEP } from '@/constants/timeline';

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
  sidebarWidth: number;
  selectedActivity: SelectedActivity | null;
  editingActivity: EditingActivity | null;
  selectedDependency: SelectedDependency | null;
  dependencyMode: boolean;
  showQuarters: boolean;
  rowSize: RowSize;

  zoomIn: () => void;
  zoomOut: () => void;
  setMonthWidth: (width: number) => void;
  setEffectiveMonthWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  selectActivity: (selection: SelectedActivity | null) => void;
  setEditingActivity: (editing: EditingActivity | null) => void;
  selectDependency: (selection: SelectedDependency | null) => void;
  setDependencyMode: (enabled: boolean) => void;
  setShowQuarters: (show: boolean) => void;
  setRowSize: (size: RowSize) => void;
};

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], []> = (set) => ({
  monthWidth: DEFAULT_MONTH_WIDTH,
  effectiveMonthWidth: DEFAULT_MONTH_WIDTH,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  selectedActivity: null,
  editingActivity: null,
  selectedDependency: null,
  dependencyMode: false,
  showQuarters: true,
  rowSize: 'medium' as RowSize,

  zoomIn: () =>
    set((state) => {
      const step = state.monthWidth < 20 ? 2 : ZOOM_STEP;
      state.monthWidth = Math.min(MAX_MONTH_WIDTH, state.monthWidth + step);
    }),

  zoomOut: () =>
    set((state) => {
      const step = state.monthWidth <= 20 ? 2 : ZOOM_STEP;
      state.monthWidth = Math.max(MIN_MONTH_WIDTH, state.monthWidth - step);
    }),

  setMonthWidth: (width) =>
    set((state) => {
      state.monthWidth = Math.max(MIN_MONTH_WIDTH, Math.min(MAX_MONTH_WIDTH, width));
    }),

  setEffectiveMonthWidth: (width) =>
    set((state) => {
      state.effectiveMonthWidth = width;
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
});
