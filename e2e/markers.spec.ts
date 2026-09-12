import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

async function openMarkers(page) {
  // Markers lives in the overflow menu, not the strip: 24 controls in a 44px band left the
  // tail unreachable.
  await page.getByRole('button', { name: 'More actions' }).click();
  await page.getByRole('menuitem', { name: /Markers/ }).click();
}

async function addMarker(page, name: string, date: string) {
  await openMarkers(page);
  await page.getByPlaceholder('Design freeze').fill(name);
  await page.locator('input[type="date"]').first().fill(date);
  await page.getByRole('button', { name: 'Add' }).click();
}

test('a named marker appears on the chart at its date', async ({ page }) => {
  const year = new Date().getFullYear();
  await addMarker(page, 'Design freeze', `${year}-06-15`);
  await page.keyboard.press('Escape');

  const marker = page.locator('[data-chart-marker]');
  await expect(marker).toHaveCount(1);
  await expect(marker).toContainText('Design freeze');
});

test('a marker keeps its calendar date across a timeline mode switch', async ({ page }) => {
  const year = new Date().getFullYear();
  await addMarker(page, 'Gate', `${year}-06-15`);
  await page.keyboard.press('Escape');

  const body = () => page.locator('[data-timeline-body]').boundingBox();
  const markerX = async () => {
    const b = (await body())!;
    const m = (await page.locator('[data-chart-marker]').boundingBox())!;
    return (m.x - b.x) / b.width; // fraction across the chart
  };

  const monthsFraction = await markerX();
  await page.getByRole('button', { name: 'Wk', exact: true }).click();
  // Weeks mode has its own chart, so the marker belongs to the months chart only.
  await expect(page.locator('[data-chart-marker]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Mo', exact: true }).click();
  expect(Math.abs((await markerX()) - monthsFraction)).toBeLessThan(0.02);
});

test('a marker mirrors with the chart in RTL', async ({ page }) => {
  const year = new Date().getFullYear();
  await addMarker(page, 'Gate', `${year}-03-01`);
  await page.keyboard.press('Escape');

  const before = (await page.locator('[data-chart-marker]').boundingBox())!;
  await page.getByRole('button', { name: 'Toggle chart direction' }).click();
  const after = (await page.locator('[data-chart-marker]').boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(1);
});

test('a marker outside the chart range is not drawn pinned to an edge', async ({ page }) => {
  await addMarker(page, 'Ancient', '1999-01-01');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-chart-marker]')).toHaveCount(0);
});

test('deleting a marker removes it, and one undo brings it back', async ({ page }) => {
  const year = new Date().getFullYear();
  await addMarker(page, 'Gate', `${year}-06-15`);
  await page.getByRole('button', { name: 'Delete marker Gate' }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-chart-marker]')).toHaveCount(0);

  await page.keyboard.press('Control+z');
  await expect(page.locator('[data-chart-marker]')).toHaveCount(1);
});
