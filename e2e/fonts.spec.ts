import { test, expect } from '@playwright/test';

test('the self-hosted family is actually used, for Latin and Hebrew', async ({ page }) => {
  const blocked: string[] = [];
  await page.route('**://fonts.googleapis.com/**', (r) => { blocked.push(r.request().url()); r.abort(); });
  await page.route('**://fonts.gstatic.com/**', (r) => { blocked.push(r.request().url()); r.abort(); });

  await page.goto('/');
  await expect(page.locator('[data-gantt-grid]')).toBeVisible();

  // Nothing may be fetched from Google: the EXE's CSP blocks it and offline builds cannot reach it.
  expect(blocked).toEqual([]);

  const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(family).toContain('Gantt Sans');

  // Both faces must have loaded from the inlined data URIs.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      latin: document.fonts.check('16px "Gantt Sans"', 'Plan'),
      hebrew: document.fonts.check('16px "Gantt Sans"', 'תוכנית'),
    };
  });
  expect(loaded.latin).toBe(true);
  expect(loaded.hebrew).toBe(true);
});
