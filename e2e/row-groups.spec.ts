import { test, expect } from '@playwright/test';

const rows = (p) => p.locator('[data-sidebar-row]');

async function addRow(page) {
  const grid = (await page.locator('[data-gantt-grid]').boundingBox())!;
  await page.mouse.dblclick(grid.x + 60, grid.y + grid.height - 12);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('a phase header collapses and expands the rows under it', async ({ page }) => {
  await addRow(page);
  await addRow(page);
  await expect(rows(page)).toHaveCount(3);

  await rows(page).nth(0).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Make phase header' }).click();
  await expect(page.locator('[data-sidebar-row][data-row-group]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Collapse phase' }).click();
  await expect(rows(page)).toHaveCount(1);

  await page.getByRole('button', { name: 'Expand phase' }).click();
  await expect(rows(page)).toHaveCount(3);
});

test('a collapsed phase shows a rollup bracket spanning its hidden bars', async ({ page }) => {
  await addRow(page);
  const body = (await page.locator('[data-timeline-body]').boundingBox())!;
  const second = (await rows(page).nth(1).boundingBox())!;
  await page.mouse.dblclick(body.x + 200, second.y + second.height / 2);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-activity-bar]')).toHaveCount(1);

  await rows(page).nth(0).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Make phase header' }).click();
  await page.getByRole('button', { name: 'Collapse phase' }).click();

  // The bar is folded away and represented by a bracket instead.
  await expect(page.locator('[data-activity-bar]')).toHaveCount(0);
  await expect(page.locator('[data-rollup-bar]')).toHaveCount(1);
});

test('un-marking a phase cannot leave rows hidden', async ({ page }) => {
  await addRow(page);
  await rows(page).nth(0).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Make phase header' }).click();
  await page.getByRole('button', { name: 'Collapse phase' }).click();
  await expect(rows(page)).toHaveCount(1);

  await rows(page).nth(0).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Not a phase' }).click();
  await expect(rows(page)).toHaveCount(2);
});

test('the collapse control reports its expanded state', async ({ page }) => {
  await addRow(page);
  await rows(page).nth(0).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Make phase header' }).click();

  const toggle = page.getByRole('button', { name: 'Collapse phase' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Expand phase' })).toHaveAttribute('aria-expanded', 'false');
});
