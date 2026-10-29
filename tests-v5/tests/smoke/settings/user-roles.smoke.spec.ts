import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — user roles page load only. No create or save.
 */
test.describe('User Roles - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.settings] }, () => {
  test('TC-SETTINGS-UR-SMOKE-001: User roles page loads; role list renders', async ({
    userRolesPage,
  }) => {
    await userRolesPage.goto();
    await expect(userRolesPage.pageHeading).toBeVisible();
    await expect(userRolesPage.table).toBeVisible();

    const rowCount = await userRolesPage.getBodyRowCount();
    expect(rowCount).toBeGreaterThan(0);

    await expect(userRolesPage.table.getByRole('columnheader', { name: /^name$/i })).toBeVisible();
    await expect(
      userRolesPage.table.getByRole('columnheader', { name: /description/i }),
    ).toBeVisible();
    await expect(userRolesPage.table.getByRole('columnheader', { name: /^action$/i })).toBeVisible();
  });
});
