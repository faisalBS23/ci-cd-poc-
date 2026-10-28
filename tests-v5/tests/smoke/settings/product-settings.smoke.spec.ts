import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — product page load. The page no longer shows "Tolls & VAT", so this test fails.
 */
test.describe('Product Settings (Tolls & VAT) - Smoke Tests', {
  tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.productSettings, TAGS.version_1_0_0],
}, () => {
  test('TC-SETTINGS-PRODUCT-SMOKE-001: Product page loads Tolls & VAT section', async ({
    productSettingsPage,
  }) => {
    await productSettingsPage.goto();
    await productSettingsPage.waitForLoaded();
    await expect(productSettingsPage.pageTitle).toBeVisible();
    await expect(productSettingsPage.tollsVatSection).toBeVisible();
    await expect(productSettingsPage.saveButton).toBeVisible();
    await expect(productSettingsPage.discardButton).toBeVisible();
  });
});
