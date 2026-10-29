import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — policies page load only. No save.
 */
test.describe('Settings Policies - Smoke', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-POL-SMOKE-001: Policies page loads; Cancellation + Payment sections visible', async ({
    policiesPage,
  }) => {
    await policiesPage.goto();
    await expect(policiesPage.pageHeading).toBeVisible();
    await expect(policiesPage.cancellationSection).toBeVisible();
    await expect(policiesPage.paymentSection).toBeVisible();
  });
});
