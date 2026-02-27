import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { Activity, Dependency, GanttChart } from '@/types/gantt';
import { loadAutoSave } from '@/utils/persistence';

export type ChartSlice = {
  chart: GanttChart;
  setChart: (chart: GanttChart) => void;
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

export const createChartSlice: StateCreator<ChartSlice, [['zustand/immer', never]], []> = (set) => ({
  chart: loadAutoSave() ?? createDefaultChart(),

  setChart: (chart) =>
    set((state) => {
      state.chart = chart;
    }),

  setChartName: (name) =>
    set((state) => {
      state.chart.name = name;
      state.chart.updatedAt = new Date().toISOString();
    }),

  setDateRange: (startYear, startMonth, endYear, endMonth) =>
    set((state) => {
      // Calculate month offset delta so activities stay on the same calendar months
      const oldAbsolute = state.chart.startYear * 12 + (state.chart.startMonth - 1);
      const newAbsolute = startYear * 12 + (startMonth - 1);
      const delta = oldAbsolute - newAbsolute;

      if (delta !== 0) {
        for (const activity of state.chart.activities) {
          activity.startMonth += delta;
        }
      }

      state.chart.startYear = startYear;
      state.chart.startMonth = startMonth;
      state.chart.endYear = endYear;
      state.chart.endMonth = endMonth;
      state.chart.updatedAt = new Date().toISOString();
    }),

  addRow: (name, afterRowId) => {
    const id = nanoid();
    set((state) => {
      if (afterRowId) {
        // Insert after the specified row by shifting orders
        const sorted = [...state.chart.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === afterRowId);
        const insertOrder = idx >= 0 ? sorted[idx]!.order + 1 : state.chart.rows.length;
        // Shift all rows at or above insertOrder
        for (const row of state.chart.rows) {
          if (row.order >= insertOrder) row.order += 1;
        }
        state.chart.rows.push({
          id,
          name: name ?? '',
          order: insertOrder,
          activityIds: [],
        });
      } else {
        const maxOrder = state.chart.rows.reduce((max, r) => Math.max(max, r.order), -1);
        state.chart.rows.push({
          id,
          name: name ?? '',
          order: maxOrder + 1,
          activityIds: [],
        });
      }
      state.chart.updatedAt = new Date().toISOString();
    });
    return id;
  },

  renameRow: (rowId, name) =>
    set((state) => {
      const row = state.chart.rows.find((r) => r.id === rowId);
      if (row) {
        row.name = name;
        state.chart.updatedAt = new Date().toISOString();
      }
    }),

  removeRow: (rowId) =>
    set((state) => {
      const row = state.chart.rows.find((r) => r.id === rowId);
      if (row) {
        const removedIds = new Set(row.activityIds);
        // Remove activities that belong to this row
        state.chart.activities = state.chart.activities.filter(
          (a) => !removedIds.has(a.id),
        );
        // Remove dependencies referencing those activities
        state.chart.dependencies = state.chart.dependencies.filter(
          (d) => !removedIds.has(d.fromActivityId) && !removedIds.has(d.toActivityId),
        );
        // Clear mergedWithNext on the row above if it was merged with the deleted row
        const sorted = [...state.chart.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === rowId);
        if (idx > 0) {
          const above = state.chart.rows.find((r) => r.id === sorted[idx - 1]!.id);
          if (above?.mergedWithNext) above.mergedWithNext = false;
        }
        state.chart.rows = state.chart.rows.filter((r) => r.id !== rowId);
        state.chart.updatedAt = new Date().toISOString();
      }
    }),

  toggleRowMerge: (rowId) =>
    set((state) => {
      const row = state.chart.rows.find((r) => r.id === rowId);
      if (!row) return;
      // Don't allow merging the last row (no next row to merge with)
      if (!row.mergedWithNext) {
        const sorted = [...state.chart.rows].sort((a, b) => a.order - b.order);
        const idx = sorted.findIndex((r) => r.id === rowId);
        if (idx >= sorted.length - 1) return;
      }
      row.mergedWithNext = !row.mergedWithNext;
      state.chart.updatedAt = new Date().toISOString();
    }),

  moveRow: (rowId, direction) =>
    set((state) => {
      const sorted = [...state.chart.rows].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((r) => r.id === rowId);
      if (idx < 0) return;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const currentRow = state.chart.rows.find((r) => r.id === sorted[idx]!.id);
      const swapRow = state.chart.rows.find((r) => r.id === sorted[swapIdx]!.id);
      if (currentRow && swapRow) {
        const tempOrder = currentRow.order;
        currentRow.order = swapRow.order;
        swapRow.order = tempOrder;
        state.chart.updatedAt = new Date().toISOString();
      }
    }),

  addActivity: (activity, rowId) => {
    const id = nanoid();
    set((state) => {
      const maxOrder = state.chart.activities.reduce((max, a) => Math.max(max, a.order), -1);
      state.chart.activities.push({
        ...activity,
        id,
        order: maxOrder + 1,
      });

      const row = state.chart.rows.find((r) => r.id === rowId);
      if (row) {
        row.activityIds.push(id);
      }

      state.chart.updatedAt = new Date().toISOString();
    });
    return id;
  },

  updateActivity: (activityId, updates) =>
    set((state) => {
      const activity = state.chart.activities.find((a) => a.id === activityId);
      if (activity) {
        // Only apply known Activity fields to prevent prototype pollution from imported data
        if (updates.name !== undefined) activity.name = updates.name;
        if (updates.color !== undefined) activity.color = updates.color;
        if (updates.startMonth !== undefined) activity.startMonth = updates.startMonth;
        if (updates.durationMonths !== undefined) activity.durationMonths = updates.durationMonths;
        if (updates.order !== undefined) activity.order = updates.order;
        if (updates.isMilestone !== undefined) activity.isMilestone = updates.isMilestone;
        if (updates.rowSpan !== undefined) activity.rowSpan = updates.rowSpan;
        if ('annotation' in updates) activity.annotation = updates.annotation;
        state.chart.updatedAt = new Date().toISOString();
      }
    }),

  removeActivity: (activityId) =>
    set((state) => {
      state.chart.activities = state.chart.activities.filter((a) => a.id !== activityId);
      // Remove from all rows
      for (const row of state.chart.rows) {
        row.activityIds = row.activityIds.filter((id) => id !== activityId);
      }
      // Remove dependencies referencing this activity
      state.chart.dependencies = state.chart.dependencies.filter(
        (d) => d.fromActivityId !== activityId && d.toActivityId !== activityId,
      );
      state.chart.updatedAt = new Date().toISOString();
    }),

  reParentActivity: (activityId, toRowId) =>
    set((state) => {
      // Remove from current row
      for (const row of state.chart.rows) {
        const idx = row.activityIds.indexOf(activityId);
        if (idx >= 0) {
          row.activityIds.splice(idx, 1);
          break;
        }
      }
      // Add to target row
      const targetRow = state.chart.rows.find((r) => r.id === toRowId);
      if (targetRow && !targetRow.activityIds.includes(activityId)) {
        targetRow.activityIds.push(activityId);
      }
      state.chart.updatedAt = new Date().toISOString();
    }),

  addDependency: (dep) => {
    // Validate before generating id
    if (dep.fromActivityId === dep.toActivityId) return '';
    const id = nanoid();
    let added = false;
    set((state) => {
      // No duplicate
      const exists = state.chart.dependencies.some(
        (d) =>
          d.fromActivityId === dep.fromActivityId &&
          d.toActivityId === dep.toActivityId &&
          d.fromSide === dep.fromSide &&
          d.toSide === dep.toSide,
      );
      if (exists) return;
      state.chart.dependencies.push({ ...dep, id });
      state.chart.updatedAt = new Date().toISOString();
      added = true;
    });
    return added ? id : '';
  },

  removeDependency: (id) =>
    set((state) => {
      state.chart.dependencies = state.chart.dependencies.filter((d) => d.id !== id);
      state.chart.updatedAt = new Date().toISOString();
    }),
});
