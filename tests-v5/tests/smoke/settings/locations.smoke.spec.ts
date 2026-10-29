import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — locations page load only. No create or save.
 */
test.describe('Settings Locations — Smoke', { tag: [TAGS.smoke, TAGS.v5] }, () => {
  test('TC-SETTINGS-LOC-SMOKE-001: Locations page + table render', async ({ locationsPage }) => {
    await locationsPage.goto();
    await expect(locationsPage.pageRoot).toBeVisible();
    await expect(locationsPage.pageHeading).toBeVisible();
    await expect(locationsPage.table.or(locationsPage.emptyState)).toBeVisible();
  });
});
