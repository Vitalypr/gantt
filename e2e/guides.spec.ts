import { test, expect } from '@playwright/test';

const bars = (p) => p.locator('[data-activity-bar]');

async function makeBar(page, rowIndex: number, xOffset: number) {
  const rows = page.locator('[data-sidebar-row]');
  const row = (await rows.nth(rowIndex).boundingBox())!;
  const body = (await page.locator('[data-timeline-body]').boundingBox())!;
  await page.mouse.dblclick(body.x + xOffset, row.y + row.height / 2);
  await page.keyboard.press('Escape');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
  // Two rows so the bars cannot overlap each other.
  const side = (await page.locator('[data-gantt-grid]').boundingBox())!;
  await page.mouse.dblclick(side.x + 60, side.y + side.height - 12);
  await expect(page.locator('[data-sidebar-row]')).toHaveCount(2);
});

test('a guide appears when a dragged bar lines up with another bar edge', async ({ page }) => {
  await makeBar(page, 0, 240);
  await makeBar(page, 1, 560);
  await expect(bars(page)).toHaveCount(2);

  const target = (await bars(page).first().boundingBox())!;
  const moving = bars(page).nth(1);
  const from = (await moving.boundingBox())!;

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  // Drag so its left edge lands on the other bar's left edge.
  await page.mouse.move(
    target.x + from.width / 2,
    from.y + from.height / 2,
    { steps: 14 },
  );

  // Both bars are one unit wide, so aligning the left edges aligns the right edges too:
  // two guides is the correct answer, not one.
  const guides = page.locator('[data-alignment-guide]');
  await expect(guides).toHaveCount(2);

  const guideXs = await guides.evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).getBoundingClientRect().left),
  );
  const nearest = Math.min(...guideXs.map((x) => Math.abs(x - target.x)));
  expect(nearest).toBeLessThan(2);

  await page.mouse.up();

  // Guides are drag-time feedback only; they must not persist.
  await expect(page.locator('[data-alignment-guide]')).toHaveCount(0);
});

test('no guide while the bar is not aligned with anything', async ({ page }) => {
  await makeBar(page, 0, 200);
  await makeBar(page, 1, 600);

  const moving = bars(page).nth(1);
  const from = (await moving.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 37, from.y + from.height / 2, { steps: 6 });
  await expect(page.locator('[data-alignment-guide]')).toHaveCount(0);
  await page.mouse.up();
});
