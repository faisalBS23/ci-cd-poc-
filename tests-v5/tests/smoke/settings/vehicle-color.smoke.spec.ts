import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — vehicle color list load only. No create or save.
 * Uses VCOLOR in the TC id so it does not collide with vehicle category.
 */
test.describe('Vehicle Color - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-VCOLOR-SMOKE-001: Verify Vehicle Color tab loads and list is discoverable', async ({
    vehicleColorPage,
  }) => {
    await vehicleColorPage.goto();
    await expect(vehicleColorPage.vehicleColorTab).toBeVisible();
    await expect(vehicleColorPage.createButton).toBeVisible();
    await vehicleColorPage.waitForTableLoaded();
    const rowCount = await vehicleColorPage.getRowCount();

    if (rowCount === 0) {
      await expect(vehicleColorPage.emptyMessage).toBeVisible();
    } else {
      const firstCell = vehicleColorPage.tableRows.nth(0).getByRole('cell').nth(0);
      expect(((await firstCell.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  });
});
