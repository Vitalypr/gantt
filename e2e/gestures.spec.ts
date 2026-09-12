/**
 * ⚠️ PARKED — written against the lost tree, not the current app.
 *
 * These specs were authored alongside work that was never committed and is gone (see
 * docs/HANDOFF.md). They depend on a `window.__ganttStore` test hook that no longer exists,
 * and they describe features the app does not have: multi-select (`selectedActivityIds`),
 * holidays, RTL `chartDirection`, and an SVG-rendered milestone.
 *
 * They are kept, skipped, because they are a precise executable specification for redoing
 * that work — not deleted, and not left failing: a permanently-red suite hides real
 * regressions. Un-skip each describe as the feature behind it lands.
 *
 * Live coverage of what the app does today is in `activity-editing.spec.ts`.
 */
import { expect, test } from '@playwright/test';
import {
  activityState,
  bar,
  centreOf,
  clearHistory,
  dragBy,
  openApp,
  undoDepth,
  unitWidth,
} from './fixtures';

const SEED = {
  rows: [
    { id: 'r1', name: 'One', activityIds: ['a1'] },
    { id: 'r2', name: 'Two', activityIds: ['a2'] },
    { id: 'r3', name: 'Three', activityIds: [] },
  ],
  activities: [
    { id: 'a1', name: 'Build', color: '#3b82f6', startMonth: 1, durationMonths: 3 },
    { id: 'a2', name: 'Test', color: '#22c55e', startMonth: 6, durationMonths: 2 },
  ],
};

test.describe.skip('direct manipulation', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, SEED);
    await clearHistory(page);
  });

  test('drags a bar along the time axis, committing once', async ({ page }) => {
    const unit = await unitWidth(page);
    await dragBy(page, await centreOf(bar(page, 'Build')), unit * 2);

    expect((await activityState(page, 'a1'))!.startMonth).toBe(3);
    // A drag the user perceives as one gesture must cost exactly one Ctrl+Z.
    expect(await undoDepth(page)).toBe(1);
  });

  test('resizes from the right edge', async ({ page }) => {
    const unit = await unitWidth(page);
    const box = (await bar(page, 'Build').boundingBox())!;
    await dragBy(page, { x: box.x + box.width - 4, y: box.y + box.height / 2 }, unit);

    expect((await activityState(page, 'a1'))!.durationMonths).toBe(4);
    expect(await undoDepth(page)).toBe(1);
  });

  test('resizes from the left edge without moving the right one', async ({ page }) => {
    const unit = await unitWidth(page);
    const box = (await bar(page, 'Build').boundingBox())!;
    await dragBy(page, { x: box.x + 4, y: box.y + box.height / 2 }, unit);

    const a = (await activityState(page, 'a1'))!;
    expect(a.startMonth).toBe(2);
    expect(a.durationMonths).toBe(2);
    // Same finish unit as before: 1 + 3 === 2 + 2.
    expect(a.startMonth + a.durationMonths).toBe(4);
  });

  test('creates a bar by dragging across an empty row', async ({ page }) => {
    const unit = await unitWidth(page);
    const row = (await page.locator('.empty-row').nth(2).boundingBox())!;
    await dragBy(page, { x: row.x + unit * 1.5, y: row.y + row.height / 2 }, unit * 2);

    await expect(page.locator('[data-activity-bar]')).toHaveCount(3);
    const created = await page.evaluate(() => {
      const acts = window.__ganttStore!.getState().chart.activities as { id: string; startMonth: number; durationMonths: number }[];
      return acts.find((a) => !['a1', 'a2'].includes(a.id))!;
    });
    // Inclusive of both end columns, exactly as the ghost preview showed.
    expect([created.startMonth, created.durationMonths]).toEqual([1, 3]);
    expect(await undoDepth(page)).toBe(1);
  });

  test('re-parents a bar dropped on another row, in one undo entry', async ({ page }) => {
    const target = (await page.locator('.empty-row').first().boundingBox())!;
    const start = await centreOf(bar(page, 'Test'));
    await dragBy(page, start, 0, target.y + target.height / 2 - start.y);

    const rows = await page.evaluate(() =>
      (window.__ganttStore!.getState().chart.rows as { id: string; activityIds: string[] }[])
        .map((r) => [r.id, r.activityIds]),
    );
    expect(rows[0]![1]).toContain('a2');
    expect(rows[1]![1]).not.toContain('a2');
    expect(await undoDepth(page)).toBe(1);
  });

  test('does not re-parent when dropped in the empty band below the last row', async ({ page }) => {
    const body = (await page.locator('[data-timeline-body]').boundingBox())!;
    const start = await centreOf(bar(page, 'Build'));
    await dragBy(page, start, 0, body.y + body.height - 20 - start.y);

    const rows = await page.evaluate(() =>
      (window.__ganttStore!.getState().chart.rows as { id: string; activityIds: string[] }[])
        .map((r) => r.activityIds),
    );
    // Treating the dead band as a drop target silently moved bars into the last row.
    expect(rows[0]).toContain('a1');
  });

  test('expands a bar across rows by dragging its bottom edge', async ({ page }) => {
    const box = (await bar(page, 'Build').boundingBox())!;
    await dragBy(page, { x: box.x + box.width / 2, y: box.y + box.height - 3 }, 0, 40);

    expect((await activityState(page, 'a1'))!.rowSpan).toBe(2);
    expect(await undoDepth(page)).toBe(1);
  });

  test('leaves everything untouched when a press never becomes a drag', async ({ page }) => {
    const before = await activityState(page, 'a1');
    const c = await centreOf(bar(page, 'Build'));
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 2, c.y);
    await page.mouse.up();

    expect(await activityState(page, 'a1')).toEqual(before);
    expect(await undoDepth(page)).toBe(0);
  });

  test('restores the cursor and text selection after every gesture', async ({ page }) => {
    const unit = await unitWidth(page);
    await dragBy(page, await centreOf(bar(page, 'Build')), unit);
    // A gesture that leaks these leaves the whole app unusable until reload.
    const body = await page.evaluate(() => ({
      cursor: document.body.style.cursor,
      userSelect: document.body.style.userSelect,
    }));
    expect(body).toEqual({ cursor: '', userSelect: '' });
  });

  test('undo restores the pre-drag position', async ({ page }) => {
    const unit = await unitWidth(page);
    await dragBy(page, await centreOf(bar(page, 'Build')), unit * 2);
    expect((await activityState(page, 'a1'))!.startMonth).toBe(3);

    await page.keyboard.press('Control+z');
    expect((await activityState(page, 'a1'))!.startMonth).toBe(1);
  });
});

test.describe.skip('direct manipulation in RTL', () => {
  test.beforeEach(async ({ page }) => {
    await openApp(page, { ...SEED, rtl: true });
    await clearHistory(page);
  });

  test('drags toward the visual left to move forward in time', async ({ page }) => {
    // In RTL the earliest date is at the right edge, so later means further left.
    const unit = await unitWidth(page);
    await dragBy(page, await centreOf(bar(page, 'Build')), -unit * 2);
    expect((await activityState(page, 'a1'))!.startMonth).toBe(3);
  });

  test('enlarges a bar from its visual-left edge, which is the temporal END', async ({ page }) => {
    // This is the bug that made bars impossible to enlarge in RTL: an inline edge swap
    // written as a double negation collapsed to the identity.
    const unit = await unitWidth(page);
    const box = (await bar(page, 'Build').boundingBox())!;
    await dragBy(page, { x: box.x + 4, y: box.y + box.height / 2 }, -unit);

    const a = (await activityState(page, 'a1'))!;
    expect(a.durationMonths).toBe(4);
    expect(a.startMonth).toBe(1); // the start must not move
  });
});
