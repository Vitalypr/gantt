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

export type UiSlice = {
  monthWidth: number;
  effectiveMonthWidth: number;
  sidebarWidth: number;
  selectedActivity: SelectedActivity | null;
  editingActivity: EditingActivity | null;
  selectedDependency: SelectedDependency | null;
  dependencyMode: boolean;

  zoomIn: () => void;
  zoomOut: () => void;
  setMonthWidth: (width: number) => void;
  setEffectiveMonthWidth: (width: number) => void;
  setSidebarWidth: (width: number) => void;
  selectActivity: (selection: SelectedActivity | null) => void;
  setEditingActivity: (editing: EditingActivity | null) => void;
  selectDependency: (selection: SelectedDependency | null) => void;
  setDependencyMode: (enabled: boolean) => void;
};

export const createUiSlice: StateCreator<UiSlice, [['zustand/immer', never]], []> = (set) => ({
  monthWidth: DEFAULT_MONTH_WIDTH,
  effectiveMonthWidth: DEFAULT_MONTH_WIDTH,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  selectedActivity: null,
  editingActivity: null,
  selectedDependency: null,
  dependencyMode: false,

  zoomIn: () =>
    set((state) => {
      state.monthWidth = Math.min(MAX_MONTH_WIDTH, state.monthWidth + ZOOM_STEP);
    }),

  zoomOut: () =>
    set((state) => {
      state.monthWidth = Math.max(MIN_MONTH_WIDTH, state.monthWidth - ZOOM_STEP);
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
});
