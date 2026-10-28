import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — profile page load only. No save.
 */
test.describe('Company Settings - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.companySettings, TAGS.version_1_0_0] }, () => {
  test('TC-SETTINGS-COMPANY-SMOKE-001: Profile Settings page loads and displays all sections', async ({
    companySettingsPage,
  }) => {
    await companySettingsPage.goto();
    await expect(companySettingsPage.basicInfoSection).toBeVisible();
    await expect(companySettingsPage.notifyByRoleSection).toBeVisible();
    await expect(companySettingsPage.smsSection).toBeVisible();
    await expect(companySettingsPage.backupEmailSection).toBeVisible();
    await expect(companySettingsPage.awsSesSection).toBeVisible();
    await expect(companySettingsPage.saveButton).toBeVisible();
    await expect(companySettingsPage.discardButton).toBeVisible();
  });
});
