import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — product settings page load only. No save.
 * Asserts the Product heading and Yes/No controls (section title text can vary).
 */
test.describe(
  'Product Settings - Smoke Tests',
  { tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.productSettings, TAGS.version_1_0_0] },
  () => {
    test('TC-SETTINGS-PRODUCT-SMOKE-001: Product page loads with save controls', async ({
      productSettingsPage,
    }) => {
      await productSettingsPage.goto();
      await expect(productSettingsPage.pageTitle).toBeVisible();
      await expect(productSettingsPage.saveButton).toBeVisible();
      await expect(productSettingsPage.discardButton).toBeVisible();
      await expect(productSettingsPage.page.getByRole('button', { name: 'Yes' }).first()).toBeVisible();
    });
  },
);
