import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — driver page load only. No save.
 */
test.describe('Driver - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-DRV-SMOKE-001: Driver page loads; category tab lists Name / Description / Action', async ({
    driverPage,
  }) => {
    await driverPage.goto();
    await expect(driverPage.pageHeading).toBeVisible();
    await expect(driverPage.categoryTab).toHaveAttribute('aria-selected', 'true');
    await driverPage.expectColumns();
  });
});
