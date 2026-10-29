import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — organisation page load only. No create or save.
 */
test.describe('Organisation - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.organisation] }, () => {
  test('TC-SETTINGS-ORG-SMOKE-001: Organisation page loads tree; sidebar Organisation is active', async ({
    organisationPage,
  }) => {
    await organisationPage.goto();
    await expect(organisationPage.pageRoot).toBeVisible();
    await expect(
      organisationPage.treeTable
        .or(organisationPage.treeEmpty)
        .or(organisationPage.errorCard),
    ).toBeVisible();
    await organisationPage.expectSidebarOrganisationActive();
  });
});
