import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — vehicle category list load only. No create or save.
 */
test.describe('Vehicle Category - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-VC-SMOKE-001: Verify Vehicle category list accessibility', async ({
    vehicleCategoryPage,
  }) => {
    await vehicleCategoryPage.goto();
    await expect(vehicleCategoryPage.vehicleCategoryTab).toBeVisible();
    await expect(vehicleCategoryPage.createButton).toBeVisible();
    await vehicleCategoryPage.waitForTableLoaded();
    const rowCount = await vehicleCategoryPage.getRowCount();

    if (rowCount === 0) {
      await expect(vehicleCategoryPage.emptyMessage).toBeVisible();
    } else {
      const firstCell = vehicleCategoryPage.tableRows.nth(0).getByRole('cell').nth(0);
      expect(((await firstCell.textContent()) || '').trim().length).toBeGreaterThan(0);
    }
  });
});
