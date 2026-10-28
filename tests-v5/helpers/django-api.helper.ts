import * as fs from 'fs';
import * as path from 'path';
import { getV5FrontendOrigin } from './v5-routes';

interface StorageCookie {
  name: string;
  value: string;
  domain: string;
}

export function getStorageStatePath(): string {
  return path.resolve(__dirname, '../../.auth/v5-user.json');
}

export function getBackendOrigin(): string {
  const backend =
    process.env.TEQ_V5_BACKEND_URL ||
    process.env.TEQ_FRONTEND_URL ||
    'https://local-be.ferdia.app:8443';
  return backend.replace(/\/$/, '');
}

/** @deprecated Prefer `getV5FrontendOrigin` from `helpers/v5-routes`. */
export { getV5FrontendOrigin as getFrontendOrigin } from './v5-routes';

function readStorageCookies(): StorageCookie[] {
  const storagePath = getStorageStatePath();
  if (!fs.existsSync(storagePath)) {
    throw new Error(
      `Missing auth storage at ${storagePath}. Run global setup or set REFRESH_V5_AUTH=true.`
    );
  }

  const storage = JSON.parse(fs.readFileSync(storagePath, 'utf-8')) as { cookies?: StorageCookie[] };
  return storage.cookies ?? [];
}

/** CSRF token from saved browser session — same source the V5 app reads via getCookie('csrftoken'). */
export function readCsrfTokenFromStorage(): string | undefined {
  const backendHost = new URL(getBackendOrigin()).hostname;
  const cookies = readStorageCookies();
  return cookies.find(
    (cookie) => cookie.name === 'csrftoken' && cookie.domain.includes(backendHost)
  )?.value;
}

/**
 * Headers Django expects on session-authenticated API writes — mirrors src/shared/api/client.ts.
 * Without Referer + X-CSRFToken, POST/PUT/DELETE return 403 even when GET succeeds.
 */
export function getDjangoWriteHeaders(referer: string): Record<string, string> {
  const csrfToken = readCsrfTokenFromStorage();
  if (!csrfToken) {
    throw new Error(
      'No csrftoken cookie in v5-user.json — refresh auth (REFRESH_V5_AUTH=true) before write API tests.'
    );
  }

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    Referer: referer,
    'X-CSRFToken': csrfToken,
  };
}

/** Direct papi/v4 context (createAuthenticatedApiContext baseURL). */
export function getPapiWriteHeaders(): Record<string, string> {
  return getDjangoWriteHeaders(`${getBackendOrigin()}/papi/v4/`);
}

/** Multipart POST to papi/v4 — omit Content-Type so Playwright sets boundary. */
export function getPapiMultipartWriteHeaders(): Record<string, string> {
  const csrfToken = readCsrfTokenFromStorage();
  if (!csrfToken) {
    throw new Error(
      'No csrftoken cookie in v5-user.json — refresh auth (REFRESH_V5_AUTH=true) before write API tests.'
    );
  }

  return {
    Accept: 'application/json',
    'X-REQUESTED-WITH': 'XMLHttpRequest',
    Referer: `${getBackendOrigin()}/papi/v4/`,
    'X-CSRFToken': csrfToken,
  };
}

/** Playwright request fixture via V5 frontend proxy (TEQ_V5_FRONTEND_URL + /papi/v4/...). */
export function getFrontendProxyWriteHeaders(): Record<string, string> {
  return getDjangoWriteHeaders(`${getV5FrontendOrigin()}/`);
}
