import type { Chart, MonthsChart, SavedChartEntry, TimelineMode, WeeksChart } from '@/types/gantt';
import { statusFromLegacyProgress } from '@/utils/activity';
import { unitForMode } from '@/types/gantt';
import { parseViewSettings } from '@/utils/viewSettings';

/** Reported when a write fails, so the UI can say so instead of failing silently. */
export type StorageFailure = { key: string; error: unknown };
let onStorageFailure: ((f: StorageFailure) => void) | null = null;
export function setStorageFailureHandler(fn: ((f: StorageFailure) => void) | null): void {
  onStorageFailure = fn;
}

/**
 * Every write goes through here.
 *
 * Reads were carefully wrapped while writes were bare, so a quota error inside the autosave
 * timer became an invisible unhandled rejection and the user kept working against storage
 * that had stopped accepting anything.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    onStorageFailure?.({ key, error });
    return false;
  }
}

const STORAGE_PREFIX = 'gantt-chart-';
const INDEX_KEY = 'gantt-chart-index';
const AUTOSAVE_KEY = 'gantt-autosave';
const WEEKS_AUTOSAVE_KEY = 'gantt-weeks-autosave';

export function saveChart(chart: Chart, mode: TimelineMode = 'months'): void {
  safeSetItem(STORAGE_PREFIX + chart.id, JSON.stringify(chart));
  updateIndex(chart, mode);
}

export function autoSave(chart: MonthsChart): boolean {
  return safeSetItem(AUTOSAVE_KEY, JSON.stringify(chart));
}

export function autoSaveWeeks(chart: WeeksChart): boolean {
  return safeSetItem(WEEKS_AUTOSAVE_KEY, JSON.stringify(chart));
}

export function loadAutoSave(): MonthsChart | null {
  const data = localStorage.getItem(AUTOSAVE_KEY);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    return normalizeChart(migrateChart(raw, 'months')) as MonthsChart;
  } catch {
    return null;
  }
}

export function loadWeeksAutoSave(): WeeksChart | null {
  const data = localStorage.getItem(WEEKS_AUTOSAVE_KEY);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    return normalizeChart(migrateWeeksChart(raw));
  } catch {
    return null;
  }
}

export function loadChart(id: string): Chart | null {
  // Validate ID format to prevent key injection
  if (!/^[\w-]+$/.test(id)) return null;
  const key = STORAGE_PREFIX + id;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    // A save written before charts carried a unit has none in its JSON; the index entry
    // remembers which chart it came from, so fall back to that rather than assuming months.
    const indexed = listSavedCharts().find((e) => e.id === id);
    return normalizeChart(migrateChart(raw, indexed?.mode ?? 'months'));
  } catch {
    return null;
  }
}

export function deleteChart(id: string): void {
  const key = STORAGE_PREFIX + id;
  localStorage.removeItem(key);
  removeFromIndex(id);
}

export function listSavedCharts(): SavedChartEntry[] {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedChartEntry[];
  } catch {
    return [];
  }
}

function updateIndex(chart: Chart, mode: TimelineMode): void {
  const entries = listSavedCharts();
  const existing = entries.findIndex((e) => e.id === chart.id);
  const entry: SavedChartEntry = {
    id: chart.id,
    name: chart.name,
    updatedAt: chart.updatedAt,
    mode,
  };
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }
  safeSetItem(INDEX_KEY, JSON.stringify(entries));
}

function removeFromIndex(id: string): void {
  const entries = listSavedCharts().filter((e) => e.id !== id);
  safeSetItem(INDEX_KEY, JSON.stringify(entries));
}

/**
 * Characters a filesystem rejects: C0 controls, the Windows-reserved set, and both path
 * separators. Written as a predicate rather than a character class so there is no regex
 * escaping to get subtly wrong — an earlier escaped version silently stopped matching the
 * backslash it was written to catch.
 */
const RESERVED_FILENAME_CHARS = '<>:"/|?*' + String.fromCharCode(92);

function isReservedFilenameChar(ch: string): boolean {
  return ch < ' ' || RESERVED_FILENAME_CHARS.includes(ch);
}

/**
 * Filename-safe form of a user-entered chart name.
 *
 * Strips only what a filesystem actually rejects. An `[^a-z0-9]` filter erases Hebrew
 * entirely - a chart named "תוכנית" became "" and every export collided on the same
 * timestamped filename.
 */
export function slugifyChartName(chartName: string): string {
  const cleaned = [...chartName]
    .map((ch) => (isReservedFilenameChar(ch) ? '-' : ch))
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .trim();
  return cleaned || 'gantt-chart';
}

function timestampSuffix(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}.${mm}.${yy}-${hh}.${min}`;
}

function buildExportFileName(chartName: string): string {
  return `${slugifyChartName(chartName)}_${timestampSuffix()}.gantt.json`;
}

function buildFolderName(chartName: string): string {
  return slugifyChartName(chartName);
}

export async function exportChartToFile(chart: Chart): Promise<void> {
  const json = JSON.stringify(chart, null, 2);
  const fileName = buildExportFileName(chart.name);

  // Try File System Access API — lets us create a project folder
  if (window.showDirectoryPicker) {
    try {
      const parentDir = await window.showDirectoryPicker({ mode: 'readwrite' });
      const folderName = buildFolderName(chart.name);
      const projectDir = await parentDir.getDirectoryHandle(folderName, { create: true });
      const fileHandle = await projectDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err) {
      // User cancelled the picker — don't fall through to download
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Other errors — fall through to legacy download
    }
  }

  // Fallback: standard download (mobile / Firefox)
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delay cleanup so mobile browsers can start the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}

export function importChartFromFile(): Promise<Chart | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.gantt.json';
    input.style.display = 'none';
    // Append to DOM — required for file picker on some mobile browsers
    document.body.appendChild(input);

    const cleanup = () => {
      if (input.parentNode) document.body.removeChild(input);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const raw = JSON.parse(reader.result as string);
          if (validateChart(raw)) {
            resolve(normalizeChart(migrateChart(raw)));
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    // Resolve null when the user cancels the file picker dialog
    input.addEventListener('cancel', () => {
      cleanup();
      resolve(null);
    });
    input.click();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OldDiscipline = { id: string; name: string; order: number; collapsed: boolean; activities: any[]; rows?: any[] };

/** Migrate old charts (discipline-based) to the new flat row model */
function migrateChart(raw: Record<string, unknown>, mode: TimelineMode = 'months'): Chart {
  // If the chart already has `rows` at the top level, it's already migrated
  if (Array.isArray(raw['rows']) && Array.isArray(raw['activities'])) {
    // Pick only known GanttChart fields to prevent untrusted keys propagating into state
    const chart: Chart = {
      id: raw['id'] as string,
      // Trust a stored unit; fall back to the mode this load is for.
      unit: raw['unit'] === 'week' || raw['unit'] === 'month' ? raw['unit'] : unitForMode(mode),
      name: raw['name'] as string,
      startYear: raw['startYear'] as number,
      startMonth: (raw['startMonth'] as number) || 1,
      endYear: raw['endYear'] as number,
      endMonth: (raw['endMonth'] as number) || 12,
      rows: raw['rows'] as Chart['rows'],
      activities: raw['activities'] as Chart['activities'],
      dependencies: (raw['dependencies'] as Chart['dependencies']) ?? [],
      createdAt: (raw['createdAt'] as string) ?? new Date().toISOString(),
      updatedAt: (raw['updatedAt'] as string) ?? new Date().toISOString(),
    };
    chart.viewSettings = parseViewSettings(raw['viewSettings']);
    return chart;
  }

  // Old format: has `disciplines` array
  const oldDisciplines = (raw['disciplines'] ?? []) as OldDiscipline[];
  const allActivities: Chart['activities'] = [];
  const allRows: Chart['rows'] = [];
  let rowOrder = 0;

  for (const disc of oldDisciplines) {
    // If discipline had rows sub-field (intermediate format)
    if (disc.rows && disc.rows.length > 0) {
      for (const oldRow of disc.rows) {
        allRows.push({
          id: oldRow.id ?? `migrated-${disc.id}-${rowOrder}`,
          name: oldRow.name || disc.name,
          order: rowOrder++,
          activityIds: oldRow.activityIds ?? [],
          mergedWithNext: oldRow.mergedWithNext,
        });
      }
    } else {
      // Old format: each activity is its own row under a discipline
      if (disc.activities.length === 0) {
        allRows.push({
          id: `migrated-${disc.id}`,
          name: disc.name,
          order: rowOrder++,
          activityIds: [],
        });
      } else {
        for (let i = 0; i < disc.activities.length; i++) {
          const act = disc.activities[i]!;
          allRows.push({
            id: `migrated-${act.id}`,
            name: i === 0 ? disc.name : '',
            order: rowOrder++,
            activityIds: [act.id],
            mergedWithNext: i < disc.activities.length - 1 && disc.activities.length > 1 ? true : undefined,
          });
        }
      }
    }
    for (const act of disc.activities) {
      allActivities.push(act);
    }
  }

  return {
    id: raw['id'] as string,
    unit: unitForMode(mode),
    name: raw['name'] as string,
    startYear: raw['startYear'] as number,
    startMonth: (raw['startMonth'] as number) ?? 1,
    endYear: raw['endYear'] as number,
    endMonth: (raw['endMonth'] as number) ?? 12,
    rows: allRows,
    activities: allActivities,
    dependencies: [],
    createdAt: (raw['createdAt'] as string) ?? new Date().toISOString(),
    updatedAt: (raw['updatedAt'] as string) ?? new Date().toISOString(),
  };
}

/** Migrate a weeks chart (simple: ensure all fields have defaults) */
function migrateWeeksChart(raw: Record<string, unknown>): WeeksChart {
  return {
    id: (raw['id'] as string) ?? '',
    unit: 'week',
    name: (raw['name'] as string) ?? 'Weeks Chart',
    startYear: (raw['startYear'] as number) ?? new Date().getFullYear(),
    startMonth: (raw['startMonth'] as number) ?? 1,
    endYear: (raw['endYear'] as number) ?? new Date().getFullYear() + 2,
    endMonth: (raw['endMonth'] as number) ?? 12,
    rows: (raw['rows'] as WeeksChart['rows']) ?? [],
    activities: (raw['activities'] as WeeksChart['activities']) ?? [],
    dependencies: (raw['dependencies'] as WeeksChart['dependencies']) ?? [],
    viewSettings: parseViewSettings(raw['viewSettings']),
    createdAt: (raw['createdAt'] as string) ?? new Date().toISOString(),
    updatedAt: (raw['updatedAt'] as string) ?? new Date().toISOString(),
  };
}

/**
 * Make a chart internally consistent.
 *
 * Every ingress point runs this. Without it the app accepts, and then crashes or renders
 * wrong on: dependencies whose endpoints are gone, `activityIds` naming activities that do
 * not exist, activities in no row at all, `rowSpan` larger than the rows beneath, negative
 * `startMonth`, and `mergedWithNext` on the final row. Imported JSON is untrusted input; it
 * gets checked once, here, and every layer past this point trusts it.
 */
export function normalizeChart<T extends Chart>(chart: T): T {
  const rows = [...(chart.rows ?? [])]
    .filter((r) => r && typeof r.id === 'string')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((r, i) => ({ ...r, order: i, activityIds: [...(r.activityIds ?? [])] }));

  const activities = (chart.activities ?? []).filter((a) => a && typeof a.id === 'string');
  const byId = new Map(activities.map((a) => [a.id, a]));

  // Drop ids with no activity, and any duplicate claim on the same activity.
  const claimed = new Set<string>();
  for (const row of rows) {
    row.activityIds = row.activityIds.filter((id) => {
      if (!byId.has(id) || claimed.has(id)) return false;
      claimed.add(id);
      return true;
    });
  }

  // An activity in no row would be invisible and unreachable; adopt it into the first row.
  const orphans = activities.filter((a) => !claimed.has(a.id));
  if (orphans.length > 0) {
    if (rows.length === 0) {
      rows.push({ id: `row-${Math.random().toString(36).slice(2, 10)}`, name: '', order: 0, activityIds: [] });
    }
    for (const o of orphans) rows[0]!.activityIds.push(o.id);
  }

  const rowIndexOf = new Map<string, number>();
  rows.forEach((r, i) => r.activityIds.forEach((id) => rowIndexOf.set(id, i)));

  const normalisedActivities = activities.map((a) => {
    const idx = rowIndexOf.get(a.id) ?? 0;
    const maxSpan = Math.max(1, rows.length - idx);
    // `progress` (0-100) became a discrete `status`. Charts saved before the change carry the
    // number, and this is the one ingress every chart passes through, so the mapping lives
    // here rather than in `migrateChart` — which returns early for already-flat charts.
    const { progress, ...rest } = a as typeof a & { progress?: unknown };
    const status = a.status ?? statusFromLegacyProgress(progress) ?? undefined;
    return {
      ...rest,
      status,
      startMonth: Math.max(0, Math.round(a.startMonth ?? 0)),
      durationMonths: Math.max(1, Math.round(a.durationMonths ?? 1)),
      rowSpan: a.rowSpan === undefined ? undefined : Math.min(Math.max(1, Math.round(a.rowSpan)), maxSpan),
    };
  });

  // `mergedWithNext` on the last row merges with nothing and leaves a borderless cell.
  if (rows.length > 0) delete rows[rows.length - 1]!.mergedWithNext;

  const dependencies = (chart.dependencies ?? []).filter(
    (d) =>
      d &&
      typeof d.id === 'string' &&
      d.fromActivityId !== d.toActivityId &&
      byId.has(d.fromActivityId) &&
      byId.has(d.toActivityId),
  );

  return { ...chart, rows, activities: normalisedActivities, dependencies };
}

function validateChart(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const chart = data as Record<string, unknown>;

  // Top-level required fields
  if (typeof chart['id'] !== 'string' || chart['id'].length === 0) return false;
  if (typeof chart['name'] !== 'string') return false;
  if (typeof chart['startYear'] !== 'number' || !Number.isFinite(chart['startYear'])) return false;
  if (typeof chart['endYear'] !== 'number' || !Number.isFinite(chart['endYear'])) return false;

  if ('dependencies' in chart && !Array.isArray(chart['dependencies'])) return false;

  const isNewFormat = Array.isArray(chart['rows']);
  const isOldFormat = Array.isArray(chart['disciplines']);
  if (!isNewFormat && !isOldFormat) return false;

  // Validate rows structure if present
  if (isNewFormat) {
    const rows = chart['rows'] as unknown[];
    for (const row of rows) {
      if (typeof row !== 'object' || row === null) return false;
      const r = row as Record<string, unknown>;
      if (typeof r['id'] !== 'string') return false;
      if (typeof r['order'] !== 'number') return false;
      if (!Array.isArray(r['activityIds'])) return false;
    }
  }

  // Validate activities structure if present
  if (Array.isArray(chart['activities'])) {
    const activities = chart['activities'] as unknown[];
    for (const act of activities) {
      if (typeof act !== 'object' || act === null) return false;
      const a = act as Record<string, unknown>;
      if (typeof a['id'] !== 'string') return false;
      if (typeof a['startMonth'] !== 'number') return false;
      if (typeof a['durationMonths'] !== 'number') return false;
    }
  }

  return true;
}
