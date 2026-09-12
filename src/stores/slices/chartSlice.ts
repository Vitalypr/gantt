import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import type { Activity, Chart, ChartMarker, Dependency, GanttRow, MonthsChart, WeeksChart, TimelineMode } from '@/types/gantt';
import { loadAutoSave, loadWeeksAutoSave } from '@/utils/persistence';
import { DEFAULT_ROW_COUNT } from '@/constants/timeline';

type ActiveChart = Chart;

/**
 * A relative change to an activity's placement.
 *
 * One action covers keyboard nudge, keyboard resize and keyboard row-change because they are
 * the same operation with different fields set - and because a gesture that changed two of
 * them through two actions would cost two Ctrl+Z presses.
 */
export type ActivityDelta = {
  /** Units later (positive) or earlier (negative). */
  units?: number;
  /** Units longer or shorter. */
  duration?: number;
  /** Rows down (positive) or up (negative). */
  rows?: number;
};

export type ChartSlice = {
  chart: MonthsChart;
  weeksChart: WeeksChart;

  // Mode-aware accessors — internal use
  _activeChart: () => ActiveChart;

  setChart: (chart: MonthsChart) => void;
  setWeeksChart: (chart: WeeksChart) => void;
  setChartName: (name: string) => void;
  setDateRange: (startYear: number, startMonth: number, endYear: number, endMonth: number) => void;

  addRow: (name?: string, afterRowId?: string) => string;
  renameRow: (rowId: string, name: string) => void;
  removeRow: (rowId: string) => void;
  toggleRowMerge: (rowId: string) => void;
  /** Label for the sideways topic column. Empty string clears it. */
  setRowTopic: (rowId: string, topic: string) => void;
  /** Join or split this row's TOPIC cell with the next row's. */
  toggleRowTopicMerge: (rowId: string) => void;
  /** Make the topic cell starting at `rowId` cover exactly `span` rows, in ONE commit —
   *  the same shape as `setActivityRowSpan`, so a drag costs one Ctrl+Z. */
  setTopicSpan: (rowId: string, span: number) => void;
  toggleRowGroup: (rowId: string) => void;
  toggleRowCollapsed: (rowId: string) => void;
  moveRow: (rowId: string, direction: 'up' | 'down') => void;

  addActivity: (activity: Omit<Activity, 'id' | 'order'>, rowId: string) => string;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
  /** Same update across many activities in ONE commit, so a bulk restyle is one Ctrl+Z. */
  updateActivities: (activityIds: string[], updates: Partial<Activity>) => void;
  removeActivities: (activityIds: string[]) => void;
  /** Copy activities in place, returning the new ids so selection can follow them. */
  duplicateActivities: (activityIds: string[], unitOffset: number) => string[];
  /** Relative move/resize/row-change for a whole selection, in ONE commit. */
  transformActivities: (activityIds: string[], delta: ActivityDelta) => void;
  /** Insert copies of detached activity data (clipboard paste). Returns the new ids. */
  pasteActivities: (activities: Activity[], intoRowId?: string) => string[];
  removeActivity: (activityId: string) => void;

  reParentActivity: (activityId: string, toRowId: string) => void;
  /** Position + row in ONE commit, so a diagonal drag costs one Ctrl+Z. */
  moveActivity: (activityId: string, startUnit: number, toRowId?: string) => void;
  /** Row span + row in ONE commit, for the same reason. */
  setActivityRowSpan: (activityId: string, rowSpan: number, toRowId?: string) => void;

  /** Replace the active chart's rows and activities with a template. One commit. */
  applyTemplate: (rows: GanttRow[], activities: Activity[]) => void;

  setLegendLabel: (color: string, label: string) => void;

  addMarker: (marker: Omit<ChartMarker, 'id'>) => string;
  updateMarker: (id: string, updates: Partial<Omit<ChartMarker, 'id'>>) => void;
  removeMarker: (id: string) => void;

  addDependency: (dep: Omit<Dependency, 'id'>) => string;
  removeDependency: (id: string) => void;
};

// Deps from UiSlice needed for mode-aware operations
type ModeDeps = {
  timelineMode: TimelineMode;
};

/** The blank rows a new chart opens with. Both modes start the same way. */
function createEmptyRows(count: number): GanttRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: nanoid(),
    name: '',
    order: i,
    activityIds: [],
  }));
}

function createDefaultChart(): MonthsChart {
  const now = new Date();
  const currentYear = now.getFullYear();
  return {
    id: nanoid(),
    unit: 'month',
    name: 'New Project',
    startYear: currentYear,
    startMonth: 1,
    endYear: currentYear + 2,
    endMonth: 12,
    rows: createEmptyRows(DEFAULT_ROW_COUNT),
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
    unit: 'week',
    name: 'New Project (Weeks)',
    startYear: currentYear,
    startMonth: 1,
    endYear: currentYear + 2,
    endMonth: 12,
    rows: createEmptyRows(DEFAULT_ROW_COUNT),
    activities: [],
    dependencies: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Apply a partial update to one activity, in place.
 *
 * `in` rather than `!== undefined` for the two optional-by-design fields: undefined is the
 * meaningful "reset to the default" value for both, so they must be assignable to undefined.
 * Single and bulk updates share this so the two cannot drift.
 */
function applyActivityUpdates(activity: Activity, updates: Partial<Activity>): void {
  if (updates.name !== undefined) activity.name = updates.name;
  if (updates.color !== undefined) activity.color = updates.color;
  if (updates.startMonth !== undefined) activity.startMonth = updates.startMonth;
  if (updates.durationMonths !== undefined) activity.durationMonths = updates.durationMonths;
  if (updates.order !== undefined) activity.order = updates.order;
  if (updates.isMilestone !== undefined) activity.isMilestone = updates.isMilestone;
  if (updates.rowSpan !== undefined) activity.rowSpan = updates.rowSpan;
  // `in`, not `!== undefined`: undefined is the meaningful "not tracked" value, and the
  // `!== undefined` guard this replaced made the reset silently do nothing.
  if ('status' in updates) activity.status = updates.status;
  if ('annotation' in updates) activity.annotation = updates.annotation;
  if ('outlineColor' in updates) activity.outlineColor = updates.outlineColor;
  if ('fontSize' in updates) activity.fontSize = updates.fontSize;
}

/** Helper: get the active chart from state (months or weeks) */
function active(state: ChartSlice & ModeDeps): ActiveChart {
  return state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
}

/** Helper: mutate the active chart in an immer draft */
function withActive(state: ChartSlice & ModeDeps): Chart {
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

  setRowTopic: (rowId, topic) =>
    set((state) => {
      const chart = withActive(state);
      const row = chart.rows.find((r) => r.id === rowId);
      if (!row) return;
      const next = topic.trim();
      // Undefined, not '': the topic column only exists when a row genuinely carries one, and
      // an empty string would keep it alive with a blank cell.
      row.topic = next === '' ? undefined : next;
      if (next === '') row.topicMergedWithNext = undefined;
      chart.updatedAt = new Date().toISOString();
    }),

  setTopicSpan: (rowId, span) =>
    set((state) => {
      const chart = withActive(state);
      const ordered = [...chart.rows].sort((a, b) => a.order - b.order);
      const i = ordered.findIndex((r) => r.id === rowId);
      if (i < 0) return;

      const wanted = Math.max(1, Math.min(ordered.length - i, Math.round(span)));

      // How far the cell reaches TODAY. Rows released by a shrink have to be cleaned up, or
      // they keep a merge flag that silently re-chains them into the next cell.
      let oldEnd = i;
      while (oldEnd < ordered.length - 1 && ordered[oldEnd]!.topicMergedWithNext) oldEnd += 1;

      const touched = Math.max(oldEnd, i + wanted - 1);
      for (let k = i; k <= touched; k++) {
        ordered[k]!.topicMergedWithNext = undefined;
        // Only the leader carries the label; a follower's own would be unreachable.
        if (k > i) ordered[k]!.topic = undefined;
      }
      for (let k = i; k < i + wanted - 1; k++) ordered[k]!.topicMergedWithNext = true;

      // A cell with no label does not render, so a span set on an unlabelled row would be
      // invisible. Giving it a placeholder is what makes drag-to-create one action.
      if (!ordered[i]!.topic?.trim()) ordered[i]!.topic = 'Topic';

      chart.updatedAt = new Date().toISOString();
    }),

  toggleRowTopicMerge: (rowId) =>
    set((state) => {
      const chart = withActive(state);
      const ordered = [...chart.rows].sort((a, b) => a.order - b.order);
      const i = ordered.findIndex((r) => r.id === rowId);
      // The last row joins nothing: a flag there would leave a cell claiming a row that is
      // not there, which is the same class of bug `mergedWithNext` has on the last row.
      if (i < 0 || i >= ordered.length - 1) return;
      const row = ordered[i]!;
      const joining = !row.topicMergedWithNext;
      row.topicMergedWithNext = joining ? true : undefined;
      if (joining) {
        // A follower's own label would be unreachable — the cell shows the leader's.
        ordered[i + 1]!.topic = undefined;
      }
      chart.updatedAt = new Date().toISOString();
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

  toggleRowGroup: (rowId) =>
    set((state) => {
      const c = withActive(state);
      const row = c.rows.find((r) => r.id === rowId);
      if (!row) return;
      row.isGroup = !row.isGroup;
      // A row that is no longer a group cannot stay collapsed, or its members would be
      // hidden with nothing left to expand them.
      if (!row.isGroup) row.collapsed = undefined;
      c.updatedAt = new Date().toISOString();
    }),

  toggleRowCollapsed: (rowId) =>
    set((state) => {
      const c = withActive(state);
      const row = c.rows.find((r) => r.id === rowId);
      if (!row?.isGroup) return;
      row.collapsed = !row.collapsed;
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
        applyActivityUpdates(activity, updates);
        c.updatedAt = new Date().toISOString();
      }
    }),

  updateActivities: (activityIds, updates) =>
    set((state) => {
      const c = withActive(state);
      const ids = new Set(activityIds);
      let touched = false;
      for (const activity of c.activities) {
        if (!ids.has(activity.id)) continue;
        applyActivityUpdates(activity, updates);
        touched = true;
      }
      if (touched) c.updatedAt = new Date().toISOString();
    }),

  removeActivities: (activityIds) =>
    set((state) => {
      const c = withActive(state);
      const ids = new Set(activityIds);
      if (ids.size === 0) return;
      c.activities = c.activities.filter((a) => !ids.has(a.id));
      for (const row of c.rows) {
        row.activityIds = row.activityIds.filter((id) => !ids.has(id));
      }
      c.dependencies = c.dependencies.filter(
        (d) => !ids.has(d.fromActivityId) && !ids.has(d.toActivityId),
      );
      c.updatedAt = new Date().toISOString();
    }),

  duplicateActivities: (activityIds, unitOffset) => {
    const newIds: string[] = [];
    set((state) => {
      const c = withActive(state);
      const ids = new Set(activityIds);
      let maxOrder = c.activities.reduce((max, a) => Math.max(max, a.order), -1);
      // Snapshot first: pushing into the array while iterating it would copy the copies.
      const sources = c.activities.filter((a) => ids.has(a.id));
      for (const source of sources) {
        const row = c.rows.find((r) => r.activityIds.includes(source.id));
        if (!row) continue;
        const id = nanoid();
        newIds.push(id);
        c.activities.push({
          ...source,
          id,
          order: ++maxOrder,
          startMonth: Math.max(0, source.startMonth + unitOffset),
        });
        row.activityIds.push(id);
      }
      if (newIds.length > 0) c.updatedAt = new Date().toISOString();
    });
    return newIds;
  },

  transformActivities: (activityIds, delta) =>
    set((state) => {
      const c = withActive(state);
      const ids = new Set(activityIds);
      if (ids.size === 0) return;

      const ordered = [...c.rows].sort((a, b) => a.order - b.order);
      let touched = false;

      for (const activity of c.activities) {
        if (!ids.has(activity.id)) continue;

        if (delta.units) {
          activity.startMonth = Math.max(0, activity.startMonth + delta.units);
          touched = true;
        }
        if (delta.duration) {
          activity.durationMonths = Math.max(1, activity.durationMonths + delta.duration);
          touched = true;
        }
        if (delta.rows) {
          const fromIndex = ordered.findIndex((r) => r.activityIds.includes(activity.id));
          if (fromIndex < 0) continue;
          const toIndex = Math.max(0, Math.min(ordered.length - 1, fromIndex + delta.rows));
          if (toIndex !== fromIndex) {
            const from = ordered[fromIndex]!;
            const to = ordered[toIndex]!;
            from.activityIds = from.activityIds.filter((id) => id !== activity.id);
            to.activityIds.push(activity.id);
            touched = true;
          }
        }
      }

      if (touched) c.updatedAt = new Date().toISOString();
    }),

  pasteActivities: (incoming, intoRowId) => {
    const newIds: string[] = [];
    set((state) => {
      const c = withActive(state);
      if (c.rows.length === 0 || incoming.length === 0) return;
      const ordered = [...c.rows].sort((a, b) => a.order - b.order);
      const target = c.rows.find((r) => r.id === intoRowId) ?? ordered[0]!;
      let maxOrder = c.activities.reduce((max, a) => Math.max(max, a.order), -1);
      for (const source of incoming) {
        const id = nanoid();
        newIds.push(id);
        // A fresh id and order; everything else about the bar is preserved.
        c.activities.push({ ...source, id, order: ++maxOrder });
        target.activityIds.push(id);
      }
      c.updatedAt = new Date().toISOString();
    });
    return newIds;
  },

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

  moveActivity: (activityId, startUnit, toRowId) =>
    set((state) => {
      const c = withActive(state);
      const activity = c.activities.find((a) => a.id === activityId);
      if (!activity) return;

      activity.startMonth = Math.max(0, startUnit);

      if (toRowId) {
        const currentRow = c.rows.find((r) => r.activityIds.includes(activityId));
        if (currentRow?.id !== toRowId) {
          const targetRow = c.rows.find((r) => r.id === toRowId);
          // Only detach once the destination is known to exist, or a bad id orphans the bar.
          if (targetRow) {
            if (currentRow) {
              currentRow.activityIds = currentRow.activityIds.filter((id) => id !== activityId);
            }
            if (!targetRow.activityIds.includes(activityId)) {
              targetRow.activityIds.push(activityId);
            }
          }
        }
      }

      c.updatedAt = new Date().toISOString();
    }),

  setActivityRowSpan: (activityId, rowSpan, toRowId) =>
    set((state) => {
      const c = withActive(state);
      const activity = c.activities.find((a) => a.id === activityId);
      if (!activity) return;

      activity.rowSpan = Math.max(1, rowSpan);

      if (toRowId) {
        const currentRow = c.rows.find((r) => r.activityIds.includes(activityId));
        if (currentRow?.id !== toRowId) {
          const targetRow = c.rows.find((r) => r.id === toRowId);
          if (targetRow) {
            if (currentRow) {
              currentRow.activityIds = currentRow.activityIds.filter((id) => id !== activityId);
            }
            if (!targetRow.activityIds.includes(activityId)) {
              targetRow.activityIds.push(activityId);
            }
          }
        }
      }

      c.updatedAt = new Date().toISOString();
    }),

  applyTemplate: (rows, activities) =>
    set((state) => {
      const c = withActive(state);
      // Wholesale replacement in ONE commit, so a template applied by mistake is one Ctrl+Z.
      c.rows = rows;
      c.activities = activities;
      c.dependencies = [];
      c.updatedAt = new Date().toISOString();
    }),

  setLegendLabel: (color, label) =>
    set((state) => {
      const c = withActive(state);
      const entries = [...(c.legend ?? [])];
      const i = entries.findIndex((e) => e.color === color);
      const trimmed = label.trim();
      // An empty label means "no meaning assigned", which is an absent entry rather than a
      // blank row in the legend.
      if (!trimmed) {
        if (i >= 0) entries.splice(i, 1);
      } else if (i >= 0) {
        entries[i] = { color, label: trimmed };
      } else {
        entries.push({ color, label: trimmed });
      }
      c.legend = entries;
      c.updatedAt = new Date().toISOString();
    }),

  addMarker: (marker) => {
    const id = nanoid();
    set((state) => {
      const c = withActive(state);
      c.markers = [...(c.markers ?? []), { ...marker, id }];
      c.updatedAt = new Date().toISOString();
    });
    return id;
  },

  updateMarker: (id, updates) =>
    set((state) => {
      const c = withActive(state);
      const marker = c.markers?.find((m) => m.id === id);
      if (!marker) return;
      if (updates.name !== undefined) marker.name = updates.name;
      if (updates.date !== undefined) marker.date = updates.date;
      if ('color' in updates) marker.color = updates.color;
      c.updatedAt = new Date().toISOString();
    }),

  removeMarker: (id) =>
    set((state) => {
      const c = withActive(state);
      c.markers = (c.markers ?? []).filter((m) => m.id !== id);
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
