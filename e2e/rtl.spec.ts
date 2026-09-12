import { test, expect } from '@playwright/test';

const bars = (p) => p.locator('[data-activity-bar]');
const rtlButton = (p) => p.getByRole('button', { name: 'Toggle chart direction' });

async function makeBarAt(page, xOffset: number) {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  await page.mouse.dblclick(body!.x + xOffset, row!.y + row!.height / 2);
  await page.keyboard.press('Escape');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
});

test('mirrors the time axis: the earlier bar sits to the RIGHT', async ({ page }) => {
  await makeBarAt(page, 120);
  await makeBarAt(page, 600);
  await expect(bars(page)).toHaveCount(2);

  const [a, b] = await bars(page).all();
  const ltrA = (await a.boundingBox())!.x;
  const ltrB = (await b.boundingBox())!.x;
  expect(ltrA).toBeLessThan(ltrB); // earlier is left in LTR

  await rtlButton(page).click();

  const rtlA = (await a.boundingBox())!.x;
  const rtlB = (await b.boundingBox())!.x;
  expect(rtlA).toBeGreaterThan(rtlB); // earlier is RIGHT in RTL
});

test('keeps every bar inside the canvas after mirroring', async ({ page }) => {
  await makeBarAt(page, 100);
  await makeBarAt(page, 400);
  await rtlButton(page).click();

  const body = (await page.locator('[data-timeline-body]').boundingBox())!;
  for (const bar of await bars(page).all()) {
    const box = (await bar.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(body.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(body.x + body.width + 1);
  }
});

test('moves the sidebar to the right-hand side', async ({ page }) => {
  const body0 = (await page.locator('[data-timeline-body]').boundingBox())!;
  const side0 = (await page.locator('[data-sidebar-row]').first().boundingBox())!;
  expect(side0.x).toBeLessThan(body0.x);

  await rtlButton(page).click();

  const body1 = (await page.locator('[data-timeline-body]').boundingBox())!;
  const side1 = (await page.locator('[data-sidebar-row]').first().boundingBox())!;
  expect(side1.x).toBeGreaterThan(body1.x);
});

test('translates month names to Hebrew in RTL', async ({ page }) => {
  const header = page.locator('[data-timeline-header]');
  await expect(header).toContainText('Jan');

  await rtlButton(page).click();

  await expect(header).not.toContainText('Jan');
  // Hebrew month abbreviations contain Hebrew letters.
  await expect(header).toContainText(/[֐-׿]/);
});

test('renders a Hebrew bar name right-to-left', async ({ page }) => {
  await makeBarAt(page, 200);
  const bar = bars(page).first();
  await bar.dblclick();
  const input = page.locator('input[aria-label="Activity name"]');
  await input.fill('תוכנית בדיקה');
  await page.keyboard.press('Enter');

  const label = bar.locator('[data-activity-label]');
  await expect(label).toHaveText('תוכנית בדיקה');
  await expect(label).toHaveAttribute('dir', 'auto');
  // `dir=auto` must resolve to rtl for Hebrew content.
  expect(await label.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
});

test('a Hebrew row name survives and reads right-to-left', async ({ page }) => {
  const row = page.locator('[data-sidebar-row]').first();
  await row.dblclick();
  const input = page.locator('input[aria-label="Row name"]');
  await input.fill('אבני דרך');
  await page.keyboard.press('Enter');
  await expect(row).toContainText('אבני דרך');
});

const persistedStartUnit = (page) =>
  page.evaluate(() => {
    const raw = localStorage.getItem('gantt-autosave');
    return raw ? JSON.parse(raw).activities?.[0]?.startMonth ?? null : null;
  });

test('dragging right in RTL moves the bar EARLIER in time', async ({ page }) => {
  await makeBarAt(page, 400);
  // Autosave is debounced; wait for the created bar to land before measuring.
  await expect.poll(() => persistedStartUnit(page), { timeout: 8000 }).not.toBeNull();
  const before = (await persistedStartUnit(page))!;

  await rtlButton(page).click();

  const bar = bars(page).first();
  // The chart is wider than the viewport and mirroring can push the bar off-screen; the
  // pointer cannot reach a box outside the viewport.
  await bar.scrollIntoViewIfNeeded();
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 240, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  // The bar follows the pointer on screen...
  await expect.poll(async () => (await bar.boundingBox())!.x).toBeGreaterThan(box.x + 100);

  // ...and because the axis is mirrored, following the pointer rightwards means moving
  // EARLIER in time. That is the whole point of `deltaToUnits` flipping sign in RTL.
  await expect.poll(() => persistedStartUnit(page), { timeout: 8000 }).toBeLessThan(before);
});

test('dragging right in LTR moves the bar LATER — the sign really does flip', async ({ page }) => {
  await makeBarAt(page, 200);
  await expect.poll(() => persistedStartUnit(page), { timeout: 8000 }).not.toBeNull();
  const before = (await persistedStartUnit(page))!;

  const bar = bars(page).first();
  const box = (await bar.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 240, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect.poll(() => persistedStartUnit(page), { timeout: 8000 }).toBeGreaterThan(before);
});
