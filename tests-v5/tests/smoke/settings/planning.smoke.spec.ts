import { expect, test } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — planning settings page load only. No save.
 */
test.describe(
  'Planning Settings - Smoke Tests',
  { tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.planningSettings] },
  () => {
    test('TC-SETTINGS-PLN-SMOKE-001: Planning page loads; four sections visible', async ({
      planningSettingsPage,
    }) => {
      await planningSettingsPage.goto();
      await expect(planningSettingsPage.pageHeading).toBeVisible();
      await expect(planningSettingsPage.defaultsSection).toBeVisible();
      await expect(planningSettingsPage.closureSection).toBeVisible();
      await expect(planningSettingsPage.cancellationSection).toBeVisible();
      await expect(planningSettingsPage.colorsSection).toBeVisible();
      await expect(planningSettingsPage.hoursInput).toBeVisible();
    });
  },
);
