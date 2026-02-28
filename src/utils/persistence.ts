import type { GanttChart, SavedChartEntry, WeeksChart } from '@/types/gantt';

const STORAGE_PREFIX = 'gantt-chart-';
const INDEX_KEY = 'gantt-chart-index';
const AUTOSAVE_KEY = 'gantt-autosave';
const WEEKS_AUTOSAVE_KEY = 'gantt-weeks-autosave';

export function saveChart(chart: GanttChart): void {
  const key = STORAGE_PREFIX + chart.id;
  localStorage.setItem(key, JSON.stringify(chart));
  updateIndex(chart);
}

export function autoSave(chart: GanttChart): void {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(chart));
}

export function autoSaveWeeks(chart: WeeksChart): void {
  localStorage.setItem(WEEKS_AUTOSAVE_KEY, JSON.stringify(chart));
}

export function loadAutoSave(): GanttChart | null {
  const data = localStorage.getItem(AUTOSAVE_KEY);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    return migrateChart(raw);
  } catch {
    return null;
  }
}

export function loadWeeksAutoSave(): WeeksChart | null {
  const data = localStorage.getItem(WEEKS_AUTOSAVE_KEY);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    return migrateWeeksChart(raw);
  } catch {
    return null;
  }
}

export function loadChart(id: string): GanttChart | null {
  // Validate ID format to prevent key injection
  if (!/^[\w-]+$/.test(id)) return null;
  const key = STORAGE_PREFIX + id;
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    const raw = JSON.parse(data);
    return migrateChart(raw);
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

function updateIndex(chart: GanttChart): void {
  const entries = listSavedCharts();
  const existing = entries.findIndex((e) => e.id === chart.id);
  const entry: SavedChartEntry = {
    id: chart.id,
    name: chart.name,
    updatedAt: chart.updatedAt,
  };
  if (existing >= 0) {
    entries[existing] = entry;
  } else {
    entries.push(entry);
  }
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function removeFromIndex(id: string): void {
  const entries = listSavedCharts().filter((e) => e.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function buildExportFileName(chartName: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const safeName = chartName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  return `${safeName}_${dd}.${mm}.${yy}-${hh}.${min}.gantt.json`;
}

function buildFolderName(chartName: string): string {
  return chartName.replace(/[^a-z0-9 ]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').trim() || 'gantt-export';
}

export async function exportChartToFile(chart: GanttChart): Promise<void> {
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

export function importChartFromFile(): Promise<GanttChart | null> {
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
            resolve(migrateChart(raw));
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
function migrateChart(raw: Record<string, unknown>): GanttChart {
  // If the chart already has `rows` at the top level, it's already migrated
  if (Array.isArray(raw['rows']) && Array.isArray(raw['activities'])) {
    // Pick only known GanttChart fields to prevent untrusted keys propagating into state
    const chart: GanttChart = {
      id: raw['id'] as string,
      name: raw['name'] as string,
      startYear: raw['startYear'] as number,
      startMonth: (raw['startMonth'] as number) || 1,
      endYear: raw['endYear'] as number,
      endMonth: (raw['endMonth'] as number) || 12,
      rows: raw['rows'] as GanttChart['rows'],
      activities: raw['activities'] as GanttChart['activities'],
      dependencies: (raw['dependencies'] as GanttChart['dependencies']) ?? [],
      createdAt: (raw['createdAt'] as string) ?? new Date().toISOString(),
      updatedAt: (raw['updatedAt'] as string) ?? new Date().toISOString(),
    };
    if (raw['viewSettings'] && typeof raw['viewSettings'] === 'object') {
      const vs = raw['viewSettings'] as Record<string, unknown>;
      chart.viewSettings = {
        sidebarWidth: typeof vs['sidebarWidth'] === 'number' ? vs['sidebarWidth'] : 240,
        monthWidth: typeof vs['monthWidth'] === 'number' ? vs['monthWidth'] : 80,
        weekWidth: typeof vs['weekWidth'] === 'number' ? vs['weekWidth'] : undefined,
        rowSize: (['small', 'medium', 'large'] as const).includes(vs['rowSize'] as 'small' | 'medium' | 'large')
          ? (vs['rowSize'] as 'small' | 'medium' | 'large')
          : 'medium',
        showQuarters: typeof vs['showQuarters'] === 'boolean' ? vs['showQuarters'] : true,
        timelineMode: vs['timelineMode'] === 'weeks' ? 'weeks' : undefined,
      };
    }
    return chart;
  }

  // Old format: has `disciplines` array
  const oldDisciplines = (raw['disciplines'] ?? []) as OldDiscipline[];
  const allActivities: GanttChart['activities'] = [];
  const allRows: GanttChart['rows'] = [];
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
    name: (raw['name'] as string) ?? 'Weeks Chart',
    startYear: (raw['startYear'] as number) ?? new Date().getFullYear(),
    startMonth: (raw['startMonth'] as number) ?? 1,
    endYear: (raw['endYear'] as number) ?? new Date().getFullYear() + 2,
    endMonth: (raw['endMonth'] as number) ?? 12,
    rows: (raw['rows'] as WeeksChart['rows']) ?? [],
    activities: (raw['activities'] as WeeksChart['activities']) ?? [],
    dependencies: (raw['dependencies'] as WeeksChart['dependencies']) ?? [],
    createdAt: (raw['createdAt'] as string) ?? new Date().toISOString(),
    updatedAt: (raw['updatedAt'] as string) ?? new Date().toISOString(),
  };
}

function validateChart(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const chart = data as Record<string, unknown>;

  // Top-level required fields
  if (typeof chart['id'] !== 'string' || chart['id'].length === 0) return false;
  if (typeof chart['name'] !== 'string') return false;
  if (typeof chart['startYear'] !== 'number' || !Number.isFinite(chart['startYear'])) return false;
  if (typeof chart['endYear'] !== 'number' || !Number.isFinite(chart['endYear'])) return false;

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
