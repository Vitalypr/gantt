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
import { activityState, bar, clearHistory, openApp, undoDepth } from './fixtures';

const SEED = {
  rows: [
    { id: 'r1', name: 'Delivery', activityIds: ['a1', 'a2'] },
    { id: 'r2', name: 'Gates', activityIds: ['m1'] },
  ],
  activities: [
    { id: 'a1', name: 'Build', color: '#3b82f6', startMonth: 1, durationMonths: 3 },
    { id: 'a2', name: 'Test', color: '#22c55e', startMonth: 5, durationMonths: 2 },
    { id: 'm1', name: 'GA', color: '#f59e0b', startMonth: 8, durationMonths: 1, isMilestone: true },
  ],
};

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await openApp(page, SEED);
  await clearHistory(page);
});

test.describe.skip('selection', () => {
  test('selects one bar, then extends with Ctrl+click', async ({ page }) => {
    await bar(page, 'Build').click();
    await expect
      .poll(() => page.evaluate(() => window.__ganttStore!.getState().selectedActivityIds))
      .toEqual(['a1']);

    await bar(page, 'Test').click({ modifiers: ['Control'] });
    await expect
      .poll(() => page.evaluate(() => window.__ganttStore!.getState().selectedActivityIds))
      .toEqual(['a1', 'a2']);
  });

  test('clears the selection when clicking the empty canvas below the last row', async ({ page }) => {
    // That band belongs to no row, so it needs its own handler — without one, the largest
    // empty area of the chart silently failed to deselect.
    await bar(page, 'Build').click();
    const body = (await page.locator('[data-timeline-body]').boundingBox())!;
    await page.mouse.click(body.x + 300, body.y + body.height - 20);

    await expect
      .poll(() => page.evaluate(() => window.__ganttStore!.getState().selectedActivityIds))
      .toEqual([]);
  });

  test('restyles the whole selection at once, in one undo entry', async ({ page }) => {
    await bar(page, 'Build').click();
    await bar(page, 'Test').click({ modifiers: ['Control'] });
    await clearHistory(page);

    await page.evaluate(() => {
      const s = window.__ganttStore!.getState() as unknown as {
        selectedActivityIds: string[];
        updateActivities: (ids: string[], u: Record<string, unknown>) => void;
      };
      s.updateActivities(s.selectedActivityIds, { color: '#ef4444' });
    });

    expect((await activityState(page, 'a1'))!.color).toBe('#ef4444');
    expect((await activityState(page, 'a2'))!.color).toBe('#ef4444');
    expect(await undoDepth(page)).toBe(1);
  });
});

test.describe.skip('renaming', () => {
  test('double-click opens an editor and Enter commits', async ({ page }) => {
    await bar(page, 'Build').dblclick();
    const input = page.locator('[data-activity-bar] input');
    await expect(input).toBeFocused();

    await input.fill('Renamed');
    await input.press('Enter');

    expect((await activityState(page, 'a1'))!.name).toBe('Renamed');
  });

  test('clicking outside commits what was typed and leaves the bar unselected-editing', async ({ page }) => {
    await bar(page, 'Build').dblclick();
    await page.locator('[data-activity-bar] input').fill('Committed');

    const body = (await page.locator('[data-timeline-body]').boundingBox())!;
    await page.mouse.click(body.x + 300, body.y + body.height - 20);

    expect((await activityState(page, 'a1'))!.name).toBe('Committed');
    await expect(page.locator('[data-activity-bar] input')).toHaveCount(0);
  });

  test('Escape discards the edit', async ({ page }) => {
    await bar(page, 'Build').dblclick();
    const input = page.locator('[data-activity-bar] input');
    await input.fill('Thrown away');
    await input.press('Escape');

    expect((await activityState(page, 'a1'))!.name).toBe('Build');
  });

  test('accepts a Hebrew name', async ({ page }) => {
    await bar(page, 'Build').dblclick();
    const input = page.locator('[data-activity-bar] input');
    await input.fill('בנייה');
    await input.press('Enter');

    expect((await activityState(page, 'a1'))!.name).toBe('בנייה');
  });
});

test.describe.skip('milestones', () => {
  test('renders as an outlined bar, not a diamond', async ({ page }) => {
    const shape = bar(page, 'GA').locator('svg');
    await expect(shape.locator('polygon')).toHaveCount(0);
    const rect = shape.locator('rect').first();
    await expect(rect).toHaveAttribute('rx', /[1-9]/);
    expect(Number(await rect.getAttribute('stroke-width'))).toBeGreaterThanOrEqual(3);
  });

  test('takes its outline from the theme and flips with dark mode', async ({ page }) => {
    const rect = bar(page, 'GA').locator('svg rect').first();
    const strokeNow = () => rect.evaluate((r) => getComputedStyle(r).stroke);

    expect(await strokeNow()).toBe('rgb(0, 0, 0)');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    expect(await strokeNow()).toBe('rgb(255, 255, 255)');
  });

  test('honours a per-milestone outline override', async ({ page }) => {
    await page.evaluate(() => {
      const s = window.__ganttStore!.getState() as unknown as {
        updateActivity: (id: string, u: Record<string, unknown>) => void;
      };
      s.updateActivity('m1', { outlineColor: '#ef4444' });
    });
    const rect = bar(page, 'GA').locator('svg rect').first();
    await expect(rect).toHaveAttribute('stroke', '#ef4444');
  });

  test('is exactly the size of a one-unit bar, outline included', async ({ page }) => {
    // A milestone that renders smaller than a one-month activity reads as a lesser thing.
    await page.evaluate(() => {
      const s = window.__ganttStore!.getState() as unknown as {
        addActivity: (a: Record<string, unknown>, rowId: string) => string;
      };
      s.addActivity({ name: 'OneMonth', color: '#3b82f6', startMonth: 8, durationMonths: 1 }, 'r1');
    });
    const barBox = (await bar(page, 'OneMonth').boundingBox())!;
    const msBox = (await bar(page, 'GA').locator('svg').boundingBox())!;

    expect(Math.abs(msBox.width - barBox.width)).toBeLessThan(0.5);
    expect(Math.abs(msBox.height - barBox.height)).toBeLessThan(0.5);
    // Both start in the same column, so their left edges must coincide.
    expect(Math.abs(msBox.x - barBox.x)).toBeLessThan(0.5);
  });

  test('sits centred on its own column', async ({ page }) => {
    const host = (await bar(page, 'GA').boundingBox())!;
    const shape = (await bar(page, 'GA').locator('svg').boundingBox())!;
    expect(Math.abs((shape.x + shape.width / 2) - (host.x + host.width / 2))).toBeLessThan(1.5);
  });
});

test.describe.skip('holidays', () => {
  test('shades holiday columns in proportion to their length', async ({ page }) => {
    const widths = await page.locator('.bg-holiday').evaluateAll((els) =>
      els.map((e) => (e as HTMLElement).getBoundingClientRect().width),
    );
    expect(widths.length).toBeGreaterThan(0);
    // A one-day holiday and a week-long one must not look the same.
    expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths) * 3);
  });

  test('never lets two bands overlap, so their fills cannot stack', async ({ page }) => {
    const spans = await page.locator('.bg-holiday').evaluateAll((els) =>
      els
        .map((e) => {
          const r = (e as HTMLElement).getBoundingClientRect();
          return [r.left, r.right] as [number, number];
        })
        .sort((a, b) => a[0] - b[0]),
    );
    for (let i = 1; i < spans.length; i++) {
      // The rendered-width floor can widen a band by a few px around its true centre.
      expect(spans[i]![0]).toBeGreaterThanOrEqual(spans[i - 1]![1] - 8);
    }
  });

  test('stays behind the bars and never swallows a click', async ({ page }) => {
    await expect(page.locator('.bg-holiday').first()).toHaveCSS('pointer-events', 'none');
  });
});

test.describe.skip('direction', () => {
  test('mirrors the time axis so the earliest date sits on the right', async ({ page }) => {
    const leftOf = async (name: string) => (await bar(page, name).boundingBox())!.x;
    const earlierLtr = await leftOf('Build');
    const laterLtr = await leftOf('Test');
    expect(earlierLtr).toBeLessThan(laterLtr);

    await page.evaluate(() => window.__ganttStore!.setState({ chartDirection: 'rtl' }));
    expect(await leftOf('Build')).toBeGreaterThan(await leftOf('Test'));
  });

  test('keeps every bar inside the canvas after mirroring', async ({ page }) => {
    await page.evaluate(() => window.__ganttStore!.setState({ chartDirection: 'rtl' }));
    const body = (await page.locator('[data-timeline-body]').boundingBox())!;
    for (const name of ['Build', 'Test', 'GA']) {
      const box = (await bar(page, name).boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(body.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(body.x + body.width + 1);
    }
  });
});

test.describe.skip('the two charts', () => {
  test('switching to weeks shows a different chart, and months survives the trip', async ({ page }) => {
    await page.evaluate(() => {
      const s = window.__ganttStore!.getState() as unknown as { setTimelineMode: (m: string) => void };
      s.setTimelineMode('weeks');
    });
    // The weeks chart is a separate document; the months bars must not appear in it.
    await expect(page.locator('[data-activity-bar]')).toHaveCount(0);

    await page.evaluate(() => {
      const s = window.__ganttStore!.getState() as unknown as { setTimelineMode: (m: string) => void };
      s.setTimelineMode('months');
    });
    await expect(page.locator('[data-activity-bar]')).toHaveCount(3);
  });
});
