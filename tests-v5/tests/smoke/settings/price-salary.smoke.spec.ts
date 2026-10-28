import { test } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

const SUITE_TAGS = [TAGS.smoke, TAGS.v5, TAGS.settings, TAGS.version_1_1_0];

/**
 * Smoke — page and catalogs reachable. No weekend/calculator save.
 */
test.describe('Price & salary - Smoke Tests', { tag: SUITE_TAGS }, () => {
  test('TC-SETTINGS-PS-SMOKE-001: Price & salary opens; catalogs are reachable', async ({
    priceSalaryPage,
  }) => {
    await test.step('Open Price & salary', async () => {
      await priceSalaryPage.goto();
      await priceSalaryPage.expectPageOpen();
    });
    await test.step('Each catalog is reachable', async () => {
      await priceSalaryPage.expectCatalogsReachable();
    });
  });

  test('TC-SETTINGS-PS-SMOKE-002: List catalogs can create; Weekend and Calculator cannot', async ({
    priceSalaryPage,
  }) => {
    await test.step('Open page', async () => {
      await priceSalaryPage.goto();
    });
    await test.step('List catalogs offer create', async () => {
      await priceSalaryPage.expectAddOnListTabs();
    });
    await test.step('Weekend and calculator have no add row', async () => {
      await priceSalaryPage.expectNoAddOnSingletons();
    });
  });
});
