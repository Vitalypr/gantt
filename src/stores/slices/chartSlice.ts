import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { Activity, Dependency, GanttChart, WeeksChart, TimelineMode } from '@/types/gantt';
import { loadAutoSave, loadWeeksAutoSave } from '@/utils/persistence';

type ActiveChart = GanttChart | WeeksChart;

export type ChartSlice = {
  chart: GanttChart;
  weeksChart: WeeksChart;

  // Mode-aware accessors — internal use
  _activeChart: () => ActiveChart;

  setChart: (chart: GanttChart) => void;
  setWeeksChart: (chart: WeeksChart) => void;
  setChartName: (name: string) => void;
  setDateRange: (startYear: number, startMonth: number, endYear: number, endMonth: number) => void;

  addRow: (name?: string, afterRowId?: string) => string;
  renameRow: (rowId: string, name: string) => void;
  removeRow: (rowId: string) => void;
  toggleRowMerge: (rowId: string) => void;
  moveRow: (rowId: string, direction: 'up' | 'down') => void;

  addActivity: (activity: Omit<Activity, 'id' | 'order'>, rowId: string) => string;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
  removeActivity: (activityId: string) => void;

  reParentActivity: (activityId: string, toRowId: string) => void;

  addDependency: (dep: Omit<Dependency, 'id'>) => string;
  removeDependency: (id: string) => void;
};

// Deps from UiSlice needed for mode-aware operations
type ModeDeps = {
  timelineMode: TimelineMode;
};

function createDefaultChart(): GanttChart {
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    id: nanoid(),
    name: 'New Project',
    startYear: currentYear,
    startMonth: 1,
    endYear: currentYear + 2,
    endMonth: 12,
    rows: [{ id: nanoid(), name: '', order: 0, activityIds: [] }],
    activities: [],
    dependencies: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function createDefaultWeeksChart(): WeeksChart {
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    id: nanoid(),
    name: 'New Project (Weeks)',
    startYear: currentYear,
    startMonth: 1,
    endYear: currentYear + 2,
    endMonth: 12,
    rows: [{ id: nanoid(), name: '', order: 0, activityIds: [] }],
    activities: [],
    dependencies: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Helper: get the active chart from state (months or weeks) */
function active(state: ChartSlice & ModeDeps): ActiveChart {
  return state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
}

/** Helper: mutate the active chart in an immer draft */
function withActive(state: ChartSlice & ModeDeps): GanttChart | WeeksChart {
  return state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
}

export const createChartSlice: StateCreator<ChartSlice & ModeDeps, [['zustand/immer', never]], [], ChartSlice> = (set, get) => ({
  chart: loadAutoSave() ?? createDefaultChart(),
  weeksChart: loadWeeksAutoSave() ?? createDefaultWeeksChart(),

  _activeChart: () => active(get()),

  setChart: (chart) =>
    set((state) => {
      state.chart = chart;
    }),

  setWeeksChart: (chart) =>
    set((state) => {
      state.weeksChart = chart;
    }),

  setChartName: (name) =>
    set((state) => {
      const c = withActive(state);
      c.name = name;
      c.updatedAt = new Date().toISOString();
    }),

  setDateRange: (startYear, startMonth, endYear, endMonth) =>
    set((state) => {
      const c = withActive(state);
      if (state.timelineMode === 'months') {
        // Calculate month offset delta so activities stay on the same calendar months
        const oldAbsolute = c.startYear * 12 + (c.startMonth - 1);
        const newAbsolute = startYear * 12 + (startMonth - 1);
        const delta = oldAbsolute - newAbsolute;

        if (delta !== 0) {
          for (const activity of c.activities) {
            activity.startMonth += delta;
          }
        }
      } else {
        // Weeks mode: recalculate week offsets when date range shifts
        // We use a simple days-based approach
        const oldStart = new Date(c.startYear, c.startMonth - 1, 1).getTime();
        const newStart = new Date(startYear, startMonth - 1, 1).getTime();
        const daysDelta = (oldStart - newStart) / (1000 * 60 * 60 * 24);
        const weekDelta = Math.round(daysDelta / 7);

        if (weekDelta !== 0) {
          for (const activity of c.activities) {
            activity.startMonth += weekDelta;
          }
        }
      }

      c.startYear = startYear;
      c.startMonth = startMonth;
      c.endYear = endYear;
      c.endMonth = endMonth;
      c.updatedAt = new Date().toISOString();
    }),

  addRow: (name, afterRowId) => {
    const id = nanoid();
    set((state) => {
      const c = withActive(state);
      if (afterRowId) {
        const sorted = [...c.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === afterRowId);
        const insertOrder = idx >= 0 ? sorted[idx]!.order + 1 : c.rows.length;
        for (const row of c.rows) {
          if (row.order >= insertOrder) row.order += 1;
        }
        c.rows.push({
          id,
          name: name ?? '',
          order: insertOrder,
          activityIds: [],
        });
      } else {
        const maxOrder = c.rows.reduce((max, r) => Math.max(max, r.order), -1);
        c.rows.push({
          id,
          name: name ?? '',
          order: maxOrder + 1,
          activityIds: [],
        });
      }
      c.updatedAt = new Date().toISOString();
    });
    return id;
  },

  renameRow: (rowId, name) =>
    set((state) => {
      const c = withActive(state);
      const row = c.rows.find((r) => r.id === rowId);
      if (row) {
        row.name = name;
        c.updatedAt = new Date().toISOString();
      }
    }),

  removeRow: (rowId) =>
    set((state) => {
      const c = withActive(state);
      const row = c.rows.find((r) => r.id === rowId);
      if (row) {
        const removedIds = new Set(row.activityIds);
        c.activities = c.activities.filter(
          (a) => !removedIds.has(a.id),
        );
        c.dependencies = c.dependencies.filter(
          (d) => !removedIds.has(d.fromActivityId) && !removedIds.has(d.toActivityId),
        );
        const sorted = [...c.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === rowId);
        if (idx > 0) {
          const above = c.rows.find((r) => r.id === sorted[idx - 1]!.id);
          if (above?.mergedWithNext) above.mergedWithNext = false;
        }
        c.rows = c.rows.filter((r) => r.id !== rowId);
        c.updatedAt = new Date().toISOString();
      }
    }),

  toggleRowMerge: (rowId) =>
    set((state) => {
      const c = withActive(state);
      const row = c.rows.find((r) => r.id === rowId);
      if (!row) return;
      if (!row.mergedWithNext) {
        const sorted = [...c.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === rowId);
        if (idx >= sorted.length - 1) return;
      }
      row.mergedWithNext = !row.mergedWithNext;
      c.updatedAt = new Date().toISOString();
    }),

  moveRow: (rowId, direction) =>
    set((state) => {
      const c = withActive(state);
      const sorted = [...c.rows].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((r) => r.id === rowId);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const currentRow = c.rows.find((r) => r.id === sorted[idx]!.id);
      const swapRow = c.rows.find((r) => r.id === sorted[swapIdx]!.id);
      if (currentRow && swapRow) {
        const tempOrder = currentRow.order;
        currentRow.order = swapRow.order;
        swapRow.order = tempOrder;
        c.updatedAt = new Date().toISOString();
      }
    }),

  addActivity: (activity, rowId) => {
    const id = nanoid();
    set((state) => {
      const c = withActive(state);
      const maxOrder = c.activities.reduce((max, a) => Math.max(max, a.order), -1);
      c.activities.push({
        ...activity,
        id,
        order: maxOrder + 1,
      });

      const row = c.rows.find((r) => r.id === rowId);
      if (row) {
        row.activityIds.push(id);
      }

      c.updatedAt = new Date().toISOString();
    });
    return id;
  },

  updateActivity: (activityId, updates) =>
    set((state) => {
      const c = withActive(state);
      const activity = c.activities.find((a) => a.id === activityId);
      if (activity) {
        if (updates.name !== undefined) activity.name = updates.name;
        if (updates.color !== undefined) activity.color = updates.color;
        if (updates.startMonth !== undefined) activity.startMonth = updates.startMonth;
        if (updates.durationMonths !== undefined) activity.durationMonths = updates.durationMonths;
        if (updates.order !== undefined) activity.order = updates.order;
        if (updates.isMilestone !== undefined) activity.isMilestone = updates.isMilestone;
        if (updates.rowSpan !== undefined) activity.rowSpan = updates.rowSpan;
        if ('annotation' in updates) activity.annotation = updates.annotation;
        c.updatedAt = new Date().toISOString();
      }
    }),

  removeActivity: (activityId) =>
    set((state) => {
      const c = withActive(state);
      c.activities = c.activities.filter((a) => a.id !== activityId);
      for (const row of c.rows) {
        row.activityIds = row.activityIds.filter((id) => id !== activityId);
      }
      c.dependencies = c.dependencies.filter(
        (d) => d.fromActivityId !== activityId && d.toActivityId !== activityId,
      );
      c.updatedAt = new Date().toISOString();
    }),

  reParentActivity: (activityId, toRowId) =>
    set((state) => {
      const c = withActive(state);
      for (const row of c.rows) {
        const idx = row.activityIds.indexOf(activityId);
        if (idx >= 0) {
          row.activityIds.splice(idx, 1);
          break;
        }
      }
      const targetRow = c.rows.find((r) => r.id === toRowId);
      if (targetRow && !targetRow.activityIds.includes(activityId)) {
        targetRow.activityIds.push(activityId);
      }
      c.updatedAt = new Date().toISOString();
    }),

  addDependency: (dep) => {
    if (dep.fromActivityId === dep.toActivityId) return '';
    const id = nanoid();
    let added = false;
    set((state) => {
      const c = withActive(state);
      const exists = c.dependencies.some(
        (d) =>
          d.fromActivityId === dep.fromActivityId &&
          d.toActivityId === dep.toActivityId &&
          d.fromSide === dep.fromSide &&
          d.toSide === dep.toSide,
      );
      if (exists) return;
      c.dependencies.push({ ...dep, id });
      c.updatedAt = new Date().toISOString();
      added = true;
    });
    return added ? id : '';
  },

  removeDependency: (id) =>
    set((state) => {
      const c = withActive(state);
      c.dependencies = c.dependencies.filter((d) => d.id !== id);
      c.updatedAt = new Date().toISOString();
    }),
});
