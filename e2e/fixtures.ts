import type { Page } from '@playwright/test';

/**
 * Shared E2E helpers.
 *
 * Two rules encoded here, both learned the hard way:
 *
 * 1. **Seed through the store, with the real schema.** Rows own `activityIds`, activities
 *    carry no `rowId`, and dependencies use `fromActivityId`/`toActivityId`. A row missing
 *    `activityIds` throws inside `Sidebar`, the error boundary unmounts the tree, and every
 *    later query reads zero elements — which looks exactly like a broken feature.
 * 2. **Never measure a long-lived HMR-patched page.** Each spec navigates fresh.
 */

export type SeedActivity = {
  id: string;
  name: string;
  color?: string;
  startMonth: number;
  durationMonths: number;
  order?: number;
  isMilestone?: boolean;
  outlineColor?: string;
  fontSize?: number;
  rowSpan?: number;
};

export type SeedRow = { id: string; name: string; activityIds: string[] };

export type Seed = {
  rows: SeedRow[];
  activities: SeedActivity[];
  dependencies?: { id: string; fromActivityId: string; toActivityId: string; fromSide: string; toSide: string }[];
  rtl?: boolean;
};

declare global {
  interface Window {
    // Exposed by src/stores/index.ts in dev builds only.
    __ganttStore?: {
      getState: () => Record<string, unknown> & { chart: Record<string, unknown> };
      setState: (partial: Record<string, unknown>) => void;
      temporal: { getState: () => { pastStates: unknown[]; clear: () => void; undo: () => void; redo: () => void } };
    };
  }
}

export async function openApp(page: Page, seed?: Seed) {
  await page.goto('/');
  await page.waitForSelector('[data-gantt-grid]');
  if (seed) await seedChart(page, seed);
}

export async function seedChart(page: Page, seed: Seed) {
  await page.evaluate((s) => {
    const store = window.__ganttStore;
    if (!store) throw new Error('__ganttStore missing — E2E requires a dev build');
    const chart = store.getState().chart;
    store.setState({
      chart: {
        ...chart,
        startYear: 2026,
        startMonth: 1,
        endYear: 2026,
        endMonth: 12,
        rows: s.rows.map((r, i) => ({ ...r, order: i })),
        activities: s.activities.map((a, i) => ({
          color: '#3b82f6',
          order: i,
          ...a,
        })),
        dependencies: s.dependencies ?? [],
        updatedAt: new Date().toISOString(),
      },
      chartDirection: s.rtl ? 'rtl' : 'ltr',
      selectedActivityIds: [],
      editingActivity: null,
      formatClipboard: null,
      formatPainterMode: 'off',
    });
  }, seed);
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-activity-bar]').length === n,
    seed.activities.length,
  );
}

/** A bar or milestone, found by its accessible name. */
export const bar = (page: Page, name: string) =>
  page.locator(`[data-activity-bar][aria-label*="${name}"]`);

export const activityState = (page: Page, id: string) =>
  page.evaluate((activityId) => {
    const activities = window.__ganttStore!.getState().chart.activities as SeedActivity[];
    return activities.find((a) => a.id === activityId) ?? null;
  }, id);

export const undoDepth = (page: Page) =>
  page.evaluate(() => window.__ganttStore!.temporal.getState().pastStates.length);

export const clearHistory = (page: Page) =>
  page.evaluate(() => window.__ganttStore!.temporal.getState().clear());

export const unitWidth = (page: Page) =>
  page.evaluate(() => window.__ganttStore!.getState().effectiveMonthWidth as number);

/**
 * Drag with real mouse input.
 *
 * Coordinates must be computed from a **fresh** bounding box immediately before the gesture —
 * a stale one silently produces a no-op drag that reads as a broken feature. Intermediate
 * steps are required: a single jump from press to release never crosses the drag threshold
 * in a way the hooks can observe.
 */
export async function dragBy(page: Page, from: { x: number; y: number }, dx: number, dy = 0) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) {
    await page.mouse.move(from.x + (dx * i) / 5, from.y + (dy * i) / 5);
  }
  await page.mouse.up();
}

export async function centreOf(locator: ReturnType<typeof bar>) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
