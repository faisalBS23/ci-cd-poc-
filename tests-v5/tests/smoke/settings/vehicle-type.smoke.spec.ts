import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — vehicle type list load only. No create or save.
 */
test.describe('Vehicle Type - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-VT-SMOKE-001: Verify Vehicles hub loads and vehicle type list is discoverable', async ({
    vehicleTypePage,
  }) => {
    await vehicleTypePage.goto();
    await expect(vehicleTypePage.vehicleTypeTab).toBeVisible();
    await expect(vehicleTypePage.createButton).toBeVisible();
    await vehicleTypePage.waitForTableLoaded();
    const rowCount = await vehicleTypePage.getRowCount();

    if (rowCount === 0) {
      await expect(vehicleTypePage.emptyMessage).toBeVisible();
    } else {
      await expect(vehicleTypePage.nameCellInRow(0)).not.toHaveText('');
    }
  });
});
