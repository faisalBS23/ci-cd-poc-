import { test as base, expect } from './fixtures/visualDebug';
import { MyProfilePage } from './page-objects/account/my-profile.page';
import { BusinessProfilePage } from './page-objects/settings/business-profile.page';
import { CompanySettingsPage } from './page-objects/settings/company-settings.page';
import { DriverPage } from './page-objects/settings/driver.page';
import { IntegrationsPage } from './page-objects/settings/integrations.page';
import { InvoicingSettingsPage } from './page-objects/settings/invoicing.page';
import { LocationsPage } from './page-objects/settings/locations.page';
import { NotificationSettingsPage } from './page-objects/settings/notification-settings.page';
import { OrganisationPage } from './page-objects/settings/organisation.page';
import { PlanningSettingsPage } from './page-objects/settings/planning-settings.page';
import { PoliciesPage } from './page-objects/settings/policies.page';
import { PriceSalaryPage } from './page-objects/settings/price-salary.page';
import { ProductSettingsPage } from './page-objects/settings/product-settings.page';
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
  integrationsPage: IntegrationsPage;
  invoicingSettingsPage: InvoicingSettingsPage;
  locationsPage: LocationsPage;
  myProfilePage: MyProfilePage;
  notificationSettingsPage: NotificationSettingsPage;
  organisationPage: OrganisationPage;
  planningSettingsPage: PlanningSettingsPage;
  policiesPage: PoliciesPage;
  priceSalaryPage: PriceSalaryPage;
  productSettingsPage: ProductSettingsPage;
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
  integrationsPage: async ({ page }, use) => {
    await use(new IntegrationsPage(page));
  },
  invoicingSettingsPage: async ({ page }, use) => {
    await use(new InvoicingSettingsPage(page));
  },
  locationsPage: async ({ page }, use) => {
    await use(new LocationsPage(page));
  },
  myProfilePage: async ({ page }, use) => {
    await use(new MyProfilePage(page));
  },
  notificationSettingsPage: async ({ page }, use) => {
    await use(new NotificationSettingsPage(page));
  },
  organisationPage: async ({ page }, use) => {
    await use(new OrganisationPage(page));
  },
  planningSettingsPage: async ({ page }, use) => {
    await use(new PlanningSettingsPage(page));
  },
  policiesPage: async ({ page }, use) => {
    await use(new PoliciesPage(page));
  },
  priceSalaryPage: async ({ page }, use) => {
    await use(new PriceSalaryPage(page));
  },
  productSettingsPage: async ({ page }, use) => {
    await use(new ProductSettingsPage(page));
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
