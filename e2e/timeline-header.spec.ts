import { test, expect } from '@playwright/test';

test('weeks mode shows Year / Month / Week tiers, aligned with the body', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();

  await page.getByRole('button', { name: 'Wk', exact: true }).click();

  const header = page.locator('[data-gantt-grid] > div:nth-child(2)');
  const tiers = header.locator('> div > div');
  await expect(tiers).toHaveCount(3);

  const year = new Date().getFullYear();
  await expect(header).toContainText(String(year));
  await expect(header).toContainText('Jan');
  await expect(header).toContainText(/W\d+/);

  // The header track and the rendered header must be the same height, or the body overlaps.
  const grid = await page.locator('[data-gantt-grid]').boundingBox();
  const hdr = await header.boundingBox();
  expect(Math.round(hdr!.height)).toBe(84); // 3 tiers x 28
  expect(hdr!.y).toBeCloseTo(grid!.y, 0);
});

test('months mode still renders and the app has no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
  await page.getByRole('button', { name: 'Wk', exact: true }).click();
  await page.getByRole('button', { name: 'Mo', exact: true }).click();
  await expect(page.locator('[data-timeline-body]')).toBeVisible();
  expect(errors).toEqual([]);
});
