import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — vehicle state list load only. No create or save.
 */
test.describe('Vehicle State - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-VS-SMOKE-001: Verify Vehicle State tab loads and list is discoverable', async ({
    vehicleStatePage,
  }) => {
    await vehicleStatePage.goto();
    await expect(vehicleStatePage.vehicleStateTab).toBeVisible();
    await expect(vehicleStatePage.createButton).toBeVisible();
    await vehicleStatePage.waitForTableLoaded();
    const rowCount = await vehicleStatePage.getRowCount();

    if (rowCount === 0) {
      await expect(vehicleStatePage.emptyMessage).toBeVisible();
    } else {
      const firstCell = vehicleStatePage.tableRows.nth(0).getByRole('cell').nth(0);
      expect(((await firstCell.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  });
});
