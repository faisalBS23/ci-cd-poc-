import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — trip settings page load only. No save.
 */
test.describe(
  'Trip Settings - Smoke Tests',
  { tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.tripSettings] },
  () => {
    test('TC-SETTINGS-TRIP-SMOKE-002: Time additions + airport list; no pickup radius', async ({
      tripSettingsPage,
    }) => {
      await tripSettingsPage.goto();
      await expect(tripSettingsPage.pageHeading).toBeVisible();
      await expect(tripSettingsPage.timeAdditionsSection).toBeVisible();
      await expect(tripSettingsPage.legPercentInput).toBeVisible();
      await expect(tripSettingsPage.airportSection).toBeVisible();
      await expect(tripSettingsPage.addAirportButton).toBeVisible();
      await expect(tripSettingsPage.table).toBeVisible();
      await expect(tripSettingsPage.page.getByText(/Maximum Pick Up Radius/i)).toHaveCount(0);
    });
  },
);
