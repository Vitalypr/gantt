import { test, expect } from '@playwright/test';

const bands = (p) => p.locator('[data-holiday]');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();
  // Holidays are a weeks-mode feature: a single day is ~1px wide in months mode.
  await page.getByRole('button', { name: 'Wk', exact: true }).click();
});

test('shades holiday columns half-transparent red, full height', async ({ page }) => {
  await expect(bands(page).first()).toBeVisible();

  const style = await bands(page).first().evaluate((el) => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, pe: cs.pointerEvents, h: el.getBoundingClientRect().height };
  });
  // Half-transparent red.
  expect(style.bg).toMatch(/rgba?\(239,\s*68,\s*68,\s*0?\.5\)/);
  expect(style.pe).toBe('none');

  const body = (await page.locator('[data-timeline-body]').boundingBox())!;
  expect(Math.round(style.h)).toBe(Math.round(body.height));
});

test('band width is PROPORTIONAL to the holiday length, not a whole column', async ({ page }) => {
  const widths = await bands(page).evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).getBoundingClientRect().width),
  );
  expect(widths.length).toBeGreaterThan(0);

  const header = page.locator('[data-timeline-header]');
  const weekCell = await header.locator('> div').last().locator('> div').first().boundingBox();
  const weekWidth = weekCell!.width;

  // A one-day holiday must be about a seventh of a week; a two-day one about two sevenths.
  const oneDay = Math.min(...widths);
  expect(oneDay).toBeGreaterThan(weekWidth / 7 - 2);
  expect(oneDay).toBeLessThan(weekWidth / 7 + 2);
  expect(Math.max(...widths)).toBeGreaterThan(oneDay * 1.5);
});

test('never overlaps another band', async ({ page }) => {
  const spans = await bands(page).evaluateAll((els) =>
    els
      .map((e) => { const r = (e as HTMLElement).getBoundingClientRect(); return [r.left, r.right] as [number, number]; })
      .sort((a, b) => a[0] - b[0]),
  );
  for (let i = 1; i < spans.length; i++) {
    expect(spans[i]![0]).toBeGreaterThanOrEqual(spans[i - 1]![1] - 0.5);
  }
});

test('stays behind the bars and never swallows a click', async ({ page }) => {
  const body = await page.locator('[data-timeline-body]').boundingBox();
  const row = await page.locator('[data-sidebar-row]').first().boundingBox();
  // Double-click directly on a shaded column; a band that intercepted would block creation.
  const band = (await bands(page).first().boundingBox())!;
  await page.mouse.dblclick(band.x + band.width / 2, row!.y + row!.height / 2);
  await expect(page.locator('[data-activity-bar]')).toHaveCount(1);
  expect(body).not.toBeNull();
});

test('mirrors with the chart in RTL', async ({ page }) => {
  const before = (await bands(page).first().boundingBox())!;
  await page.getByRole('button', { name: 'Toggle chart direction' }).click();
  const after = (await bands(page).first().boundingBox())!;
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(1);
  // Width is unchanged by mirroring — only position moves.
  expect(Math.abs(after.width - before.width)).toBeLessThan(0.5);
});

test('months mode shows no holiday bands, which would be 1px slivers', async ({ page }) => {
  await page.getByRole('button', { name: 'Mo', exact: true }).click();
  await expect(page.locator('[data-holiday]')).toHaveCount(0);
});
