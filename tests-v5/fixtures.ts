import { test as base, expect } from './fixtures/visualDebug';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';

type PocFixtures = {
  priceSalaryPage: PriceSalaryPage;
};

export const test = base.extend<PocFixtures>({
  priceSalaryPage: async ({ page }, use) => {
    await use(new PriceSalaryPage(page));
  },
});

export { expect };
