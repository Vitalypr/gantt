/**
 * Activity editing: annotation, milestone shape, font size, frame colour.
 *
 * Every test here covers a defect that was reported from the running app rather than found
 * by reading, so they are written against observable DOM/computed style, not internals.
 */
import { test, expect } from '@playwright/test';

const bars = (p) => p.locator('[data-activity-bar]');

async function makeBar(page) {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  await page.mouse.dblclick(body!.x + 200, row!.y + row!.height / 2);
  await expect(bars(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  return bars(page).first();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('annotation: menu item opens an editor that stays open and saves', async ({ page }) => {
  const bar = await makeBar(page);
  await bar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Annotation/ }).click();

  const ta = page.locator('textarea');
  await expect(ta).toBeVisible();          // used to close instantly
  await expect(ta).toBeFocused();
  await ta.fill('ship by Q3');
  await page.keyboard.press('Enter');
  await expect(ta).toHaveCount(0);

  // Saved: the icon appears and carries the text.
  await expect(page.getByRole('button', { name: 'Edit annotation' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit annotation' })).toHaveAttribute('title', 'ship by Q3');
});

test('annotation: Escape cancels without writing', async ({ page }) => {
  const bar = await makeBar(page);
  await bar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: /Annotation/ }).click();
  await page.locator('textarea').fill('discard me');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit annotation' })).toHaveCount(0);
});

test('milestone renders as a framed rectangle, not a rotated diamond', async ({ page }) => {
  const bar = await makeBar(page);
  const barBox = await bar.boundingBox();

  await bar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Convert to Milestone' }).click();

  const ms = page.locator('[data-milestone]');
  await expect(ms).toHaveCount(1);

  const style = await ms.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { transform: cs.transform, outlineWidth: cs.outlineWidth, height: cs.height };
  });
  expect(style.transform === 'none' || !style.transform.includes('matrix(0.7')).toBeTruthy();
  expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(3);

  const msBox = await ms.boundingBox();
  expect(Math.round(msBox!.height)).toBe(Math.round(barBox!.height));
});

test('font size: Larger grows the label, and one undo reverts it', async ({ page }) => {
  const bar = await makeBar(page);
  const label = bar.locator('[data-activity-label]');
  const before = await label.evaluate((el) => getComputedStyle(el).fontSize);

  await bar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Font Size' }).click();
  await page.getByRole('menuitem', { name: 'Larger' }).click();

  const after = await label.evaluate((el) => getComputedStyle(el).fontSize);
  expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));

  await page.keyboard.press('Control+z');
  const undone = await label.evaluate((el) => getComputedStyle(el).fontSize);
  expect(undone).toBe(before);
});

test('frame colour: picking one changes the outline, default is grey', async ({ page }) => {
  const bar = await makeBar(page);
  const initial = await bar.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(initial).toBe('rgb(156, 163, 175)'); // --color-bar-outline, light theme

  await bar.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Frame Colour' }).click();
  await page.getByRole('menuitem').filter({ hasText: '' }).first().waitFor({ state: 'attached' }).catch(() => {});
  await page.locator('button[aria-label="Red #ef4444"]').click();

  await expect.poll(async () => bar.evaluate((el) => getComputedStyle(el).outlineColor))
    .toBe('rgb(239, 68, 68)');
});
