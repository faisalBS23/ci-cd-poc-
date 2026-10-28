import { test as base, expect } from './fixtures/visualDebug';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';

type PocFixtures = {
  companySettingsPage: CompanySettingsPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  priceSalaryPage: PriceSalaryPage;
};

export const test = base.extend<PocFixtures>({
  companySettingsPage: async ({ page }, use) => {
    await use(new CompanySettingsPage(page));
  },
  invoicingSettingsPage: async ({ page }, use) => {
    await use(new InvoicingSettingsPage(page));
  },
  priceSalaryPage: async ({ page }, use) => {
    await use(new PriceSalaryPage(page));
  },
});

export { expect };
