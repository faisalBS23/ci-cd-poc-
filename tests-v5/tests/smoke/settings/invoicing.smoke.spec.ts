import { expect, test } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — invoicing page load only. No save.
 */
test.describe('Settings Invoicing - Smoke Tests', {
  tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.invoicingSettings],
}, () => {
  test('TC-SETTINGS-INVOICE-SMOKE-001: Page loads and shows current settings', async ({
    invoicingSettingsPage,
  }) => {
    await invoicingSettingsPage.goto();
    await expect(invoicingSettingsPage.pageHeading).toBeVisible();
    await expect(invoicingSettingsPage.paymentInfoInput).toBeVisible();
    await expect(invoicingSettingsPage.latePaymentInterestInput).toBeVisible();
    await expect(invoicingSettingsPage.saveButton).toBeVisible();
    await expect(invoicingSettingsPage.discardButton).toBeVisible();
    await expect(invoicingSettingsPage.saveButton).toBeDisabled();
  });
});
