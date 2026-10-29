import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — trip type page load only. No create or save.
 */
test.describe('Trip Type - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-TT-SMOKE-001: Trip type page loads; default rows visible', async ({
    tripTypePage,
  }) => {
    await tripTypePage.goto();
    await expect(tripTypePage.pageHeading).toBeVisible();
    await expect(tripTypePage.table).toBeVisible();

    const rowCount = await tripTypePage.getBodyRowCount();
    expect(rowCount).toBeGreaterThan(0);

    await tripTypePage.expectRowVisible(/Fixed\s*Trip/i);
    await tripTypePage.expectRowVisible(/Normal\s*Trip/i);
    await expect(tripTypePage.table.getByRole('columnheader', { name: 'Trip type' })).toBeVisible();
    await expect(tripTypePage.table.getByRole('columnheader', { name: 'Priority' })).toBeVisible();
    await expect(tripTypePage.table.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  });
});
