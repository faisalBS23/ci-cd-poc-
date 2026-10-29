import { test as base, expect } from './fixtures/visualDebug';
import { BusinessProfilePage } from './page-objects/settings/business-profile.page';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { DriverPage } from './page-objects/settings/driver.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { OrganisationPage } from './page-objects/settings/organisation.page';
import { PoliciesPage } from './page-objects/settings/policies.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';
import { TripSettingsPage } from './page-objects/settings/trip-settings.page';
import { TripTypePage } from './page-objects/settings/trip-type.page';
import { UserRolesPage } from './page-objects/settings/user-roles.page';
import { VehicleCategoryPage } from './page-objects/settings/vehicle-category.page';
import { VehicleColorPage } from './page-objects/settings/vehicle-color.page';
import { VehicleDecorationPage } from './page-objects/settings/vehicle-decoration.page';
import { VehicleStatePage } from './page-objects/settings/vehicle-state.page';
import { VehicleTypePage } from './page-objects/settings/vehicle-type.page';

type PocFixtures = {
  businessProfilePage: BusinessProfilePage;
  companySettingsPage: CompanySettingsPage;
  driverPage: DriverPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  organisationPage: OrganisationPage;
  policiesPage: PoliciesPage;
  priceSalaryPage: PriceSalaryPage;
  tripSettingsPage: TripSettingsPage;
  tripTypePage: TripTypePage;
  userRolesPage: UserRolesPage;
  vehicleCategoryPage: VehicleCategoryPage;
  vehicleColorPage: VehicleColorPage;
  vehicleDecorationPage: VehicleDecorationPage;
  vehicleStatePage: VehicleStatePage;
  vehicleTypePage: VehicleTypePage;
};

export const test = base.extend<PocFixtures>({
  businessProfilePage: async ({ page }, use) => {
    await use(new BusinessProfilePage(page));
  },
  companySettingsPage: async ({ page }, use) => {
    await use(new CompanySettingsPage(page));
  },
  driverPage: async ({ page }, use) => {
    await use(new DriverPage(page));
  },
  invoicingSettingsPage: async ({ page }, use) => {
    await use(new InvoicingSettingsPage(page));
  },
  organisationPage: async ({ page }, use) => {
    await use(new OrganisationPage(page));
  },
  policiesPage: async ({ page }, use) => {
    await use(new PoliciesPage(page));
  },
  priceSalaryPage: async ({ page }, use) => {
    await use(new PriceSalaryPage(page));
  },
  tripSettingsPage: async ({ page }, use) => {
    await use(new TripSettingsPage(page));
  },
  tripTypePage: async ({ page }, use) => {
    await use(new TripTypePage(page));
  },
  userRolesPage: async ({ page }, use) => {
    await use(new UserRolesPage(page));
  },
  vehicleCategoryPage: async ({ page }, use) => {
    await use(new VehicleCategoryPage(page));
  },
  vehicleColorPage: async ({ page }, use) => {
    await use(new VehicleColorPage(page));
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
