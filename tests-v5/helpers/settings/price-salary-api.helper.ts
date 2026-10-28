import { APIRequestContext, request as playwrightRequest } from '@playwright/test';
import {
  getBackendOrigin,
  getPapiWriteHeaders,
  getStorageStatePath,
} from '../django-api.helper';

/** Public v4papi paths (relative to `/papi/v4/`). */
export const DPF_API_PATH = 'settings/dynamic-price-factors/';
export const SEASON_API_PATH = 'settings/seasons/';
export const NIGHTSHIFT_API_PATH = 'settings/nightshifts/';
export const CONVENIENT_API_PATH = 'settings/convenient-times/';
export const INCONVENIENT_API_PATH = 'settings/inconvenient-times/';
export const GEO_API_PATH = 'settings/geographical-areas/';

export const AUTO_PREFIX = '[AUTO]';

export type PriceSalaryListCatalog =
  | 'dpf'
  | 'season'
  | 'nightshift'
  | 'convenient'
  | 'inconvenient'
  | 'geo';

export interface PriceSalaryRow {
  id: number;
  name: string;
  description: string;
}

interface Envelope {
  items?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
}

const LIST_PATH: Record<PriceSalaryListCatalog, string> = {
  dpf: DPF_API_PATH,
  season: SEASON_API_PATH,
  nightshift: NIGHTSHIFT_API_PATH,
  convenient: CONVENIENT_API_PATH,
  inconvenient: INCONVENIENT_API_PATH,
  geo: GEO_API_PATH,
};

export function getPapiBaseUrl(): string {
  return `${getBackendOrigin()}/papi/v4/`;
}

export function uniqueAutoLabel(tag: string): string {
  return `${AUTO_PREFIX} PS ${tag} ${Date.now()}`.slice(0, 60);
}

export function listPath(catalog: PriceSalaryListCatalog): string {
  return LIST_PATH[catalog];
}

export function detailPath(catalog: PriceSalaryListCatalog, id: number): string {
  return `${listPath(catalog)}${id}/`;
}

export async function createAuthenticatedApiContext(): Promise<APIRequestContext> {
  return playwrightRequest.newContext({
    baseURL: getPapiBaseUrl(),
    storageState: getStorageStatePath(),
    ignoreHTTPSErrors: true,
    extraHTTPHeaders: getPapiWriteHeaders(),
  });
}

const asRow = (raw: Record<string, unknown>): PriceSalaryRow => ({
  id: Number(raw.id),
  name: String(raw.name ?? ''),
  description: String(raw.description ?? ''),
});

const envelopeItems = (body: Envelope): PriceSalaryRow[] =>
  (body.items ?? body.data ?? []).map(asRow);

export async function listCatalog(
  api: APIRequestContext,
  catalog: PriceSalaryListCatalog,
  params: { page?: number; perPage?: number; search?: string } = {}
) {
  const query: Record<string, string | number> = {
    page: params.page ?? 1,
    per_page: params.perPage ?? 100,
  };
  if (params.search?.trim()) query.search = params.search.trim();
  return api.get(listPath(catalog), { params: query });
}

export async function deleteCatalogRow(
  api: APIRequestContext,
  catalog: PriceSalaryListCatalog,
  id: number
) {
  return api.delete(detailPath(catalog, id));
}

export async function safeDeleteCatalogRow(
  api: APIRequestContext,
  catalog: PriceSalaryListCatalog,
  id: number
): Promise<void> {
  const response = await deleteCatalogRow(api, catalog, id);
  if (![204, 403, 404, 409].includes(response.status())) {
    throw new Error(
      `safeDeleteCatalogRow ${catalog} ${id} unexpected status ${response.status()}`
    );
  }
}

export async function findCatalogByLabel(
  api: APIRequestContext,
  catalog: PriceSalaryListCatalog,
  label: string
): Promise<PriceSalaryRow | undefined> {
  const response = await listCatalog(api, catalog, { search: label });
  if (!response.ok()) return undefined;
  const body = (await response.json()) as Envelope;
  return envelopeItems(body).find((row) => row.name === label || row.description === label);
}

export async function createConvenientTimeForTest(
  api: APIRequestContext,
  overrides: {
    description?: string;
    startedTime?: string;
    endTime?: string;
    weekday?: string[];
    convenientDate?: string | null;
    isActive?: boolean;
    isSetWeekend?: boolean;
    isIncludeAsPriceFactor?: boolean;
  } = {}
): Promise<PriceSalaryRow> {
  const description = overrides.description ?? uniqueAutoLabel('CT');
  const response = await api.post(CONVENIENT_API_PATH, {
    data: {
      description,
      started_time: overrides.startedTime ?? '08:00',
      end_time: overrides.endTime ?? '16:00',
      weekday: overrides.weekday ?? [''],
      convenient_date: overrides.convenientDate ?? null,
      is_active: overrides.isActive ?? true,
      is_set_weekend: overrides.isSetWeekend ?? true,
      is_include_as_price_factor: overrides.isIncludeAsPriceFactor ?? true,
    },
  });
  if (![200, 201].includes(response.status())) {
    throw new Error(
      `createConvenientTimeForTest failed (${response.status()}): ${await response.text()}`
    );
  }
  const row = asRow((await response.json()) as Record<string, unknown>);
  return { ...row, description: row.description || description, name: row.name || description };
}

export async function createInconvenientTimeForTest(
  api: APIRequestContext,
  overrides: {
    description?: string;
    startedTime?: string;
    endTime?: string;
    weekday?: string[];
    inconvenientDate?: string | null;
    isActive?: boolean;
    isSetWeekend?: boolean;
    isIncludeAsPriceFactor?: boolean;
  } = {}
): Promise<PriceSalaryRow> {
  const description = overrides.description ?? uniqueAutoLabel('IT');
  const response = await api.post(INCONVENIENT_API_PATH, {
    data: {
      description,
      started_time: overrides.startedTime ?? '08:00',
      end_time: overrides.endTime ?? '16:00',
      weekday: overrides.weekday ?? [''],
      inconvenient_date: overrides.inconvenientDate ?? null,
      is_active: overrides.isActive ?? true,
      is_set_weekend: overrides.isSetWeekend ?? true,
      is_include_as_price_factor: overrides.isIncludeAsPriceFactor ?? true,
    },
  });
  if (![200, 201].includes(response.status())) {
    throw new Error(
      `createInconvenientTimeForTest failed (${response.status()}): ${await response.text()}`
    );
  }
  const row = asRow((await response.json()) as Record<string, unknown>);
  return { ...row, description: row.description || description, name: row.name || description };
}

export async function deleteAutoByPrefix(
  api: APIRequestContext,
  catalog: PriceSalaryListCatalog,
  prefix = AUTO_PREFIX
): Promise<void> {
  const response = await listCatalog(api, catalog, { search: prefix });
  if (!response.ok()) return;
  const body = (await response.json()) as Envelope;
  const matches = envelopeItems(body).filter(
    (row) => row.name.startsWith(prefix) || row.description.startsWith(prefix)
  );
  for (const row of matches) {
    await safeDeleteCatalogRow(api, catalog, row.id);
  }
}

/** DPF first so windows/seasons are not blocked by a linked factor. */
export async function deleteAllAutoPriceSalaryRows(api: APIRequestContext): Promise<void> {
  await deleteAutoByPrefix(api, 'dpf');
  await deleteAutoByPrefix(api, 'convenient');
  await deleteAutoByPrefix(api, 'inconvenient');
  await deleteAutoByPrefix(api, 'season');
  await deleteAutoByPrefix(api, 'nightshift');
  await deleteAutoByPrefix(api, 'geo');
}
