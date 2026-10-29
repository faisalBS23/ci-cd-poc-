import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — business profile list load only. No create or save.
 */
test.describe('Business Profile - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.version_1_0_0] }, () => {
  test('TC-SETTINGS-BP-SMOKE-001: Admin can view existing billing profiles for the company', async ({
    businessProfilePage,
  }) => {
    await businessProfilePage.goto();
    await businessProfilePage.waitForTableLoaded();

    const rowCount = await businessProfilePage.getRowCount();
    expect(rowCount).toBeGreaterThan(0);

    const firstProfileName = await businessProfilePage.getProfileNameInRow(0);
    expect(firstProfileName.length).toBeGreaterThan(0);
  });
});
