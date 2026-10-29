/** Paths used by the integrations page object. Smoke load tests do not call the write APIs. */
export const INTEGRATION_PATHS = {
  list: '/papi/v4/settings/integrations/',
  save: '/papi/v4/settings/integrations/save/',
  disconnect: '/papi/v4/settings/integrations/disconnect/',
} as const;
