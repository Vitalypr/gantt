import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('Ctrl+wheel zoom keeps the point under the cursor fixed', async ({ page }) => {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  await page.mouse.dblclick(body!.x + 500, row!.y + row!.height / 2);
  await page.keyboard.press('Escape');

  const bar = page.locator('[data-activity-bar]').first();
  const anchorX = (await bar.boundingBox())!.x + 5;

  await page.mouse.move(anchorX, row!.y + row!.height / 2);
  await page.keyboard.down('Control');
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -120);
  await page.keyboard.up('Control');

  // The bar the cursor was over must still be under the cursor, not slid away.
  const after = (await bar.boundingBox())!;
  expect(Math.abs(after.x - anchorX)).toBeLessThan(40);
});

test('toolbar zoom keeps the viewport centre stable', async ({ page }) => {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  await page.mouse.dblclick(body!.x + 400, row!.y + row!.height / 2);
  await page.keyboard.press('Escape');

  const bar = page.locator('[data-activity-bar]').first();
  const scroll = page.locator('[data-gantt-scroll]');
  const viewport = (await scroll.boundingBox())!;
  const centre = viewport.x + viewport.width / 2;

  const before = (await bar.boundingBox())!.x;
  const distBefore = Math.abs(before - centre);

  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();

  const distAfter = Math.abs((await bar.boundingBox())!.x - centre);
  // Zoom magnifies around the centre, so a bar near it stays near it. Blind zoom would let
  // the distance grow without bound.
  expect(distAfter).toBeLessThan(distBefore + viewport.width / 2);
});
