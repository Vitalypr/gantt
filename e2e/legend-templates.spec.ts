import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

const openMenu = (page) => page.getByRole('button', { name: 'More actions' }).click();

test('a template fills the chart, and one undo removes it', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('menuitem', { name: /Start from a template/ }).click();
  await page.getByRole('button', { name: /Product delivery/ }).click();

  await expect(page.locator('[data-sidebar-row]')).toHaveCount(5);
  await expect(page.locator('[data-activity-bar]')).toHaveCount(7);
  await expect(page.locator('[data-gantt-grid]')).toContainText('Implementation');

  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-activity-bar]')).toHaveCount(0);
});

test('the legend lists the colours in use and is editable in place', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('menuitem', { name: /Start from a template/ }).click();
  await page.getByRole('button', { name: /Product delivery/ }).click();

  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Show legend' }).click();

  const legend = page.locator('[data-chart-legend]');
  await expect(legend).toBeVisible();
  // The template uses five distinct colours.
  await expect(legend.locator('button')).toHaveCount(5);

  await legend.locator('button').first().click();
  const input = legend.locator('input').first();
  await input.fill('Not started');
  await page.keyboard.press('Enter');
  await expect(legend).toContainText('Not started');
});

test('the legend sits inside the capture root, so it ships in exports', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('menuitem', { name: /Start from a template/ }).click();
  await page.getByRole('button', { name: /Product delivery/ }).click();
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Show legend' }).click();

  const inside = await page.locator('[data-chart-legend]').evaluate((el) =>
    el.closest('[data-gantt-grid]') !== null,
  );
  expect(inside).toBe(true);
});

test('legend visibility survives a reload', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('menuitem', { name: 'Show legend' }).click();
  // Let the debounced autosave flush.
  await page.waitForTimeout(1400);
  await page.reload();
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
  await openMenu(page);
  await expect(page.getByRole('menuitem', { name: 'Hide legend' })).toBeVisible();
});
