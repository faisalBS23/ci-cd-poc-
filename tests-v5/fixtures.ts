import { test as base, expect } from './fixtures/visualDebug';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { DriverPage } from './page-objects/settings/driver.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { PoliciesPage } from './page-objects/settings/policies.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';

type PocFixtures = {
  companySettingsPage: CompanySettingsPage;
  driverPage: DriverPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  policiesPage: PoliciesPage;
  priceSalaryPage: PriceSalaryPage;
};

export const test = base.extend<PocFixtures>({
  companySettingsPage: async ({ page }, use) => {
    await use(new CompanySettingsPage(page));
  },
  driverPage: async ({ page }, use) => {
    await use(new DriverPage(page));
  },
  invoicingSettingsPage: async ({ page }, use) => {
    await use(new InvoicingSettingsPage(page));
  },
  policiesPage: async ({ page }, use) => {
    await use(new PoliciesPage(page));
  },
  priceSalaryPage: async ({ page }, use) => {
    await use(new PriceSalaryPage(page));
  },
});

export { expect };
