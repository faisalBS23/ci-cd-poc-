import { test as base, expect } from './fixtures/visualDebug';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { DriverPage } from './page-objects/settings/driver.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { PoliciesPage } from './page-objects/settings/policies.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';
import { TripTypePage } from './page-objects/settings/trip-type.page';
import { VehicleCategoryPage } from './page-objects/settings/vehicle-category.page';
import { VehicleDecorationPage } from './page-objects/settings/vehicle-decoration.page';
import { VehicleStatePage } from './page-objects/settings/vehicle-state.page';
import { VehicleTypePage } from './page-objects/settings/vehicle-type.page';

type PocFixtures = {
  companySettingsPage: CompanySettingsPage;
  driverPage: DriverPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  policiesPage: PoliciesPage;
  priceSalaryPage: PriceSalaryPage;
  tripTypePage: TripTypePage;
  vehicleCategoryPage: VehicleCategoryPage;
  vehicleDecorationPage: VehicleDecorationPage;
  vehicleStatePage: VehicleStatePage;
  vehicleTypePage: VehicleTypePage;
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
  tripTypePage: async ({ page }, use) => {
    await use(new TripTypePage(page));
  },
  vehicleCategoryPage: async ({ page }, use) => {
    await use(new VehicleCategoryPage(page));
  },
  vehicleDecorationPage: async ({ page }, use) => {
    await use(new VehicleDecorationPage(page));
  },
  vehicleStatePage: async ({ page }, use) => {
    await use(new VehicleStatePage(page));
  },
  vehicleTypePage: async ({ page }, use) => {
    await use(new VehicleTypePage(page));
  },
});

export { expect };
