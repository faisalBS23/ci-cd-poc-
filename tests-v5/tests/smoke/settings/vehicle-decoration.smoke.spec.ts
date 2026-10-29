import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — vehicle decoration list load only. No create or save.
 */
test.describe('Vehicle Decoration - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-VD-SMOKE-001: Verify Vehicle Decorations tab loads and list is discoverable', async ({
    vehicleDecorationPage,
  }) => {
    await vehicleDecorationPage.goto();
    await expect(vehicleDecorationPage.vehicleDecorationTab).toBeVisible();
    await expect(vehicleDecorationPage.createButton).toBeVisible();
    await vehicleDecorationPage.waitForTableLoaded();
    const rowCount = await vehicleDecorationPage.getRowCount();

    if (rowCount === 0) {
      await expect(vehicleDecorationPage.emptyMessage).toBeVisible();
    } else {
      const firstCell = vehicleDecorationPage.tableRows.nth(0).getByRole('cell').nth(0);
      expect(((await firstCell.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  });
});
