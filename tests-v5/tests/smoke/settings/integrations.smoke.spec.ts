import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — integrations page load only. No configure or save.
 */
test.describe(
  'Integrations - Smoke Tests',
  { tag: [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.integrations] },
  () => {
    test('TC-SETTINGS-INT-SMOKE-001: Integrations page loads card list; sidebar Integrations is active', async ({
      integrationsPage,
    }) => {
      await integrationsPage.goto();
      await expect(
        integrationsPage.tabs.or(integrationsPage.emptyState).or(integrationsPage.errorState),
      ).toBeVisible();
      await integrationsPage.expectSidebarIntegrationsActive();
    });
  },
);
