/** Paths used by the organisation page object. Smoke load tests do not call the write APIs. */
export const ORGANISATION_PATHS = {
  tree: '/papi/v4/settings/organisation/tree/',
  units: '/papi/v4/settings/organisation/units/',
  unitDetail: (id: number) => `/papi/v4/settings/organisation/units/${id}/`,
  garages: '/papi/v4/settings/organisation/garages/',
  garageDetail: (id: number) => `/papi/v4/settings/organisation/garages/${id}/`,
  garageArchive: (id: number) => `/papi/v4/settings/organisation/garages/${id}/archive/`,
} as const;
