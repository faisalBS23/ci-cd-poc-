import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — notification settings page load only. No save.
 */
test.describe(
  'Notification Settings - Smoke Tests',
  { tag: [TAGS.smoke, TAGS.v5, TAGS.notificationSettings] },
  () => {
    test('TC-SETTINGS-NOTIF-SMOKE-001: Notification Settings page loads successfully with all three sections visible', async ({
      notificationSettingsPage,
    }) => {
      await notificationSettingsPage.goto();
      await expect(notificationSettingsPage.alertSection).toBeVisible();
      await expect(notificationSettingsPage.customerSection).toBeVisible();
      await expect(notificationSettingsPage.notifyDriverSmsSection).toBeVisible();
      await expect(notificationSettingsPage.saveButton).toBeVisible();
      await expect(notificationSettingsPage.discardButton).toBeVisible();
    });
  },
);
