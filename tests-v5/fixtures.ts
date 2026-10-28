import { test as base, expect } from './fixtures/visualDebug';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';
import { ProductSettingsPage } from './page-objects/settings/product-settings.page';

type PocFixtures = {
  companySettingsPage: CompanySettingsPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  priceSalaryPage: PriceSalaryPage;
  productSettingsPage: ProductSettingsPage;
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
  productSettingsPage: async ({ page }, use) => {
    await use(new ProductSettingsPage(page));
  },
});

export { expect };
