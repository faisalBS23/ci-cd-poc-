import type { Page } from '@playwright/test';
import { planningVehiclesRoot, vehicleEditUrl, vehicleNewUrl } from './planning/vehicles-path';

/**
 * V5 SPA navigation URLs.
 *
 * Single source of truth: `TEQ_V5_FRONTEND_URL`.
 * - Local Vite:  https://local-fe.ferdia.app:8080
 * - Deployed:    https://teq-test.ferdia.app/v5
 *
 * Always build **full** URLs for `page.goto`. Absolute paths like `/settings/…`
 * drop any `/v5` segment from Playwright `baseURL` (origin-only resolve).
 *
 * Do not set `TEQ_V5_BASE_PATH` for navigation — switch FE/BE URLs only.
 */

const DEFAULT_FRONTEND = 'https://local-fe.ferdia.app:8080';

/** Frontend origin including deploy mount path (e.g. `/v5`), no trailing slash. */
export function getV5FrontendOrigin(): string {
  return (process.env.TEQ_V5_FRONTEND_URL || DEFAULT_FRONTEND).replace(/\/$/, '');
}

/**
 * Full SPA URL for a route under the V5 app.
 * @param route e.g. `/settings/organisation` or `settings/organisation`
 */
export function v5PageUrl(route: string): string {
  const path = route.startsWith('/') ? route : `/${route}`;
  return `${getV5FrontendOrigin()}${path}`;
}

/**
 * @deprecated Prefer `v5PageUrl`. Same behaviour (full URL) so existing
 * `page.goto(v5Path(...))` callers keep working without BASE_PATH.
 */
export function v5Path(route: string): string {
  return v5PageUrl(route);
}

/**
 * Pathname prefix of `TEQ_V5_FRONTEND_URL` (`''` local, `/v5` deployed).
 * Kept for rare relative-path needs; prefer `v5PageUrl` for navigation.
 */
export function v5BasePath(): string {
  try {
    const { pathname } = new URL(getV5FrontendOrigin());
    const trimmed = pathname.replace(/\/$/, '');
    return trimmed === '/' ? '' : trimmed;
  } catch {
    return '';
  }
}

/**
 * appPath === v5Path. v5Path already joins BASE_PATH + normalized route and
 * already returns '/' for an empty route, so it fully satisfies what a
 * separate `appPath` helper would do — this is an alias, not a second
 * implementation. v5Path/v5BasePath remain the ONLY place the /v5 prefix is
 * emitted for routes that go through this mechanism.
 */
export const appPath = v5Path;

/** Central, typed route registry — every entry is a function. All routes
 *  here are mount-path-relative in the real app, so appPath() is the
 *  canonical construction throughout. */
export const routes = {
  account: {
    personal: (): string => appPath('/user-profile/personal'),
    settings: (): string => appPath('/user-profile/account'),
  },

  settings: {
    profile: (): string => appPath('/settings/profile'),
    hr: (): string => appPath('/settings/hr'),
    planning: (): string => appPath('/settings/planning'),
    trip: (): string => appPath('/settings/trip'),
    invoicing: (): string => appPath('/settings/invoicing'),
    tripAirportLegacy: (): string => appPath('/settings/admin/airport'),
    driver: (): string => appPath('/settings/driver'),
    driverCategoryLegacy: (): string => appPath('/settings/driver/category'),
    driverCertificateLegacy: (): string => appPath('/settings/driver/certificate'),
    priceSalary: (): string => appPath('/settings/price-salary'),
    accounting: (): string => appPath('/settings/accounting'),
    vehicles: {
      list: (): string => appPath('/settings/vehicles'),
      vehicleTypeNew: (): string => appPath('/settings/vehicle-type/new'),
      vehicleCategory: (): string => appPath('/settings/vehicles?tab=vehicle-category'),
      vehicleState: (): string => appPath('/settings/vehicles?tab=vehicle-state'),
      vehicleColor: (): string => appPath('/settings/vehicles?tab=vehicle-color'),
      vehicleDecoration: (): string => appPath('/settings/vehicles?tab=vehicle-decoration'),
    },
    dashboard: (): string => appPath('/settings/dashboard'),
    product: (): string => appPath('/settings/product'),
    /** `tab` is the `?tab=` query: profile | companies | routes | access (any string, to test fallbacks). */
    passengerApp: (tab?: string): string =>
      appPath(tab ? `/settings/passenger-app?tab=${encodeURIComponent(tab)}` : '/settings/passenger-app'),
    passengerAppLegacy: (): string => appPath('/passenger-plus'),
  },

  sales: {
    requests: {
      list: (): string => appPath('/sales/request'),
      new: (): string => appPath('/sales/request/new'),
      network: (): string => appPath('/sales/request?sort=-departure&tab=network'),
    },
    customers: {
      list: (): string => appPath('/sales/customers'),
      new: (): string => appPath('/sales/customers/new'),
      newTab: (tab: string): string => appPath(`/sales/customers/new?tab=${tab}`),
      categories: (): string => appPath('/sales/customers/categories'),
      /** No route of its own — bulk upload is a dialog on the list page. */
      bulkUpload: (): string => routes.sales.customers.list(),
      edit: (customerId: number | string): string => appPath(`/sales/customers/${customerId}/edit`),
      editTab: (customerId: number | string, tab: string): string =>
        appPath(`/sales/customers/${customerId}/edit?tab=${tab}`),
    },
    quotations: {
      /** Order Details (a.k.a. quotation detail) — `SALES_QUOTATION_DETAIL`. */
      detail: (orderId: number | string): string => appPath(`/sales/quotations/${orderId}`),
      /** Order Details with a `?tab=` query param (`trips` | `order` | `price`). */
      detailTab: (orderId: number | string, tab: string): string =>
        appPath(`/sales/quotations/${orderId}?tab=${tab}`),
      /** Full-form Edit Trip — nested under the quotation so GET has orderId. */
      editTrip: (orderId: number | string, tripId: number | string): string =>
        appPath(`/sales/quotations/${orderId}/edit-trip/${tripId}`),
    },
  },

  hr: {
    employees: {
      list: (): string => v5Path('/hr/employee'),
      detail: (employeeId: number | string): string => v5Path(`/hr/employees/${employeeId}`),
      tab: (employeeId: number | string, tab: string): string =>
        v5Path(`/hr/employees/${employeeId}?tab=${tab}`),
    },
  },

  planning: {
    trips: {
      /** V5 Trip report — normal trips only. Fixed trip ids resolve to the V1
       *  page instead, which is not a route of this app. */
      report: (tripId: string | number): string => appPath(`/planning/trips/${tripId}/report`),
    },

    vehicles: {
      list: (page?: Page): string => planningVehiclesRoot(page),
      new: (page?: Page): string => vehicleNewUrl(page),

      /** Read-only Vehicle Details route — distinct from the edit-form
       *  route family below (`/planning/vehicles/:id`, no /edit segment). */
      view: (vehicleRouteId: string | number, tab?: string, page?: Page): string => {
        const base = `${planningVehiclesRoot(page)}/${vehicleRouteId}`;
        return tab ? `${base}?tab=${tab}` : base;
      },

      general: (vehicleRouteId: string | number, page?: Page): string =>
        vehicleEditUrl(page, vehicleRouteId, 'general'),
      calendar: (vehicleRouteId: string | number, page?: Page): string =>
        vehicleEditUrl(page, vehicleRouteId, 'calendar'),
      documents: (vehicleRouteId: string | number, page?: Page): string =>
        vehicleEditUrl(page, vehicleRouteId, 'documents'),
      bookabus: (vehicleRouteId: string | number, page?: Page): string =>
        vehicleEditUrl(page, vehicleRouteId, 'bookabus'),
    },
  },
} as const;
