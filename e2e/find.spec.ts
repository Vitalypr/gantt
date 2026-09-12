import { test, expect } from '@playwright/test';

async function makeNamedBar(page, xOffset: number, name: string) {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  await page.mouse.dblclick(body!.x + xOffset, row!.y + row!.height / 2);
  const input = page.locator('input[aria-label="Activity name"]');
  await input.fill(name);
  await page.keyboard.press('Enter');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('Ctrl+F opens find, matches by name, and Escape closes it', async ({ page }) => {
  await makeNamedBar(page, 200, 'Detailed design');
  await makeNamedBar(page, 600, 'Procurement');

  await page.keyboard.press('Control+f');
  const find = page.locator('[data-find-panel]');
  await expect(find).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Find activity' })).toBeFocused();

  await page.getByRole('textbox', { name: 'Find activity' }).fill('procure');
  await expect(find.getByRole('button', { name: /Procurement/ })).toBeVisible();
  await expect(find.getByRole('button', { name: /Detailed design/ })).toHaveCount(0);

  await page.keyboard.press('Escape');
  await expect(find).toHaveCount(0);
});

test('matches Hebrew names', async ({ page }) => {
  await makeNamedBar(page, 200, 'תכנון מפורט');
  await page.keyboard.press('Control+f');
  await page.getByRole('textbox', { name: 'Find activity' }).fill('מפורט');
  await expect(page.locator('[data-find-panel]').getByRole('button', { name: /מפורט/ })).toBeVisible();
});

test('selecting a result selects that bar', async ({ page }) => {
  await makeNamedBar(page, 200, 'Alpha');
  await makeNamedBar(page, 600, 'Beta');
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+f');
  await page.getByRole('textbox', { name: 'Find activity' }).fill('Beta');
  await page.locator('[data-find-panel]').getByRole('button', { name: /Beta/ }).click();

  const selected = page.locator('[data-activity-bar].activity-bar--selected');
  await expect(selected).toHaveCount(1);
  await expect(selected).toContainText('Beta');
});

test('reports no matches rather than showing everything', async ({ page }) => {
  await makeNamedBar(page, 200, 'Alpha');
  await page.keyboard.press('Control+f');
  await page.getByRole('textbox', { name: 'Find activity' }).fill('zzzz');
  await expect(page.locator('[data-find-panel]')).toContainText('No matches');
});
