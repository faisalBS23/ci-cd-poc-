import { Locator, Page } from '@playwright/test';
import { v5PageUrl } from '../v5-routes';

/**
 * Planning vehicle routes — full URLs from `TEQ_V5_FRONTEND_URL`.
 * Override root with `TEQ_V5_PLANNING_VEHICLES_ROOT` when needed.
 */
export function planningVehiclesRoot(_page?: Page): string {
  const fromEnv = process.env.TEQ_V5_PLANNING_VEHICLES_ROOT?.trim().replace(/\/$/, '');
  if (fromEnv) {
    // Allow absolute override or path-only override.
    if (/^https?:\/\//i.test(fromEnv)) return fromEnv;
    return v5PageUrl(fromEnv.startsWith('/') ? fromEnv : `/${fromEnv}`);
  }
  return v5PageUrl('/planning/vehicles');
}

export function vehicleFleetPkFromUrl(url: string): string | null {
  const match = url.match(/\/(?:v5\/)?planning\/vehicles\/(\d+)/);
  return match?.[1] ?? null;
}

export function vehicleFleetUrlPattern(): RegExp {
  return /\/(?:v5\/)?planning\/vehicles\/\d+/;
}

export function vehicleEditUrl(
  page: Page | undefined,
  vehicleRouteId: string | number,
  tab: string
): string {
  return `${planningVehiclesRoot(page)}/${vehicleRouteId}/edit/${tab}`;
}

export function vehicleNewUrl(page?: Page): string {
  return `${planningVehiclesRoot(page)}/new`;
}

export function vehicleEditRoutePattern(): RegExp {
  return /\/(?:v5\/)?planning\/vehicles\/(\d+)\/edit/;
}

export function vehicleListUrlPattern(): RegExp {
  return /\/(?:v5\/)?planning\/vehicles\/?$/;
}

export function vehicleNewUrlPattern(): RegExp {
  return /\/(?:v5\/)?planning\/vehicles\/new/;
}

export function vehicleEditGeneralUrlPattern(): RegExp {
  return /\/(?:v5\/)?planning\/vehicles\/[^/]+\/edit\/general/;
}

/** Header expand control — footer also has aria-label "Expand" on wide viewports. */
export function vehicleDrawerExpandButton(drawer: Locator): Locator {
  return drawer.locator('button.p-button-icon-only[aria-label="Expand"]');
}
