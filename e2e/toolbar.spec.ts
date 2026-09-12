import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('the toolbar strip fits without horizontal scrolling', async ({ page }) => {
  const strip = page.locator('[data-app-chrome]').first();
  const overflow = await strip.evaluate((el) => el.scrollWidth - el.clientWidth);
  // `overflow-x-auto scrollbar-hide` hides the scrollbar, so overflow here is invisible to
  // the user and the tail of the toolbar becomes unreachable.
  expect(overflow).toBeLessThanOrEqual(1);
});

test('rare actions are behind one affordance, and still reachable', async ({ page }) => {
  await page.getByRole('button', { name: 'More actions' }).click();
  const menu = page.getByRole('menu');
  for (const item of ['Export JSON', 'Import JSON', 'Snapshot (JPEG)', 'Snapshot (SVG)', 'Print / Save as PDF', 'Markers…', 'Help']) {
    await expect(menu.getByRole('menuitem', { name: item })).toBeVisible();
  }
});

/**
 * App-wide, not toolbar-only. A Radix tooltip supplies `aria-describedby` while open; it does
 * NOT name the button, so an icon-only control without a label announces as just "button".
 * Asserted as an invariant so the next icon button cannot quietly reintroduce it.
 */
test('no icon-only button anywhere lacks an accessible name', async ({ page }) => {
  const unnamed = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => !(b.textContent ?? '').trim() && !b.getAttribute('aria-label'))
      .map((b) => b.querySelector('svg')?.getAttribute('class') ?? '(no icon)'),
  );
  expect(unnamed).toEqual([]);
});

test('toggles report their pressed state to assistive tech', async ({ page }) => {
  const rtl = page.getByRole('button', { name: 'Toggle chart direction' });
  await expect(rtl).toHaveAttribute('aria-pressed', 'false');
  await rtl.click();
  await expect(rtl).toHaveAttribute('aria-pressed', 'true');
});
