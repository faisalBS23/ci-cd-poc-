import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';
import type { DriverCatalog } from '../../helpers/settings/driver-api.helper';

/**
 * Page Object for Settings → Categories → Driver (`/settings/driver`).
 * One page, two catalogs (category + certificate).
 */
export class DriverPage {
  readonly page: Page;
  readonly pageUrl: string;
  readonly legacyCategoryUrl: string;
  readonly legacyCertificateUrl: string;

  readonly pageHeading: Locator;
  readonly categoryTab: Locator;
  readonly certificateTab: Locator;
  readonly table: Locator;
  readonly addCategoryButton: Locator;
  readonly addCertificateButton: Locator;
  readonly categoriesHeading: Locator;
  readonly driverMenuLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = routes.settings.driver();
    this.legacyCategoryUrl = routes.settings.driverCategoryLegacy();
    this.legacyCertificateUrl = routes.settings.driverCertificateLegacy();

    this.pageHeading = page.getByRole('heading', { name: 'Driver', exact: true });
    this.categoryTab = page.getByRole('tab', { name: 'Driver category' });
    this.certificateTab = page.getByRole('tab', { name: 'Driver certificate' });
    this.table = page.getByRole('table');
    this.addCategoryButton = page.getByRole('button', { name: 'Add driver category' });
    this.addCertificateButton = page.getByRole('button', { name: 'Add driver certificate' });
    this.categoriesHeading = page.getByRole('heading', { name: 'Categories', level: 3 });
    this.driverMenuLink = page
      .getByRole('navigation')
      .filter({ has: page.getByRole('heading', { name: 'Categories', level: 3 }) })
      .getByRole('link', { name: /Driver/ });
  }

  formDialog(catalog: DriverCatalog): Locator {
    const heading =
      catalog === 'category'
        ? /Add driver category|Edit driver category/
        : /Add driver certificate|Edit driver certificate/;
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: heading }),
    });
  }

  deleteDialog(catalog: DriverCatalog): Locator {
    const title =
      catalog === 'category' ? 'Delete driver category?' : 'Delete driver certificate?';
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: title }),
    });
  }

  nameInput(catalog: DriverCatalog): Locator {
    return this.formDialog(catalog).getByLabel(/^Name/);
  }

  descriptionInput(catalog: DriverCatalog): Locator {
    return this.formDialog(catalog).getByLabel(/^Description/);
  }

  saveButton(catalog: DriverCatalog): Locator {
    return this.formDialog(catalog).getByRole('button', { name: 'Save' });
  }

  cancelButton(catalog: DriverCatalog): Locator {
    return this.formDialog(catalog)
      .getByRole('button', { name: 'Cancel' })
      .filter({ hasText: 'Cancel' });
  }

  searchRegion(): Locator {
    return this.page.getByRole('search').first();
  }

  searchInput(catalog: DriverCatalog): Locator {
    const label =
      catalog === 'category' ? 'Search driver categories' : 'Search driver certificates';
    return this.searchRegion().getByRole('textbox', { name: label });
  }

  searchExpandButton(catalog: DriverCatalog): Locator {
    const label =
      catalog === 'category' ? 'Search driver categories' : 'Search driver certificates';
    return this.searchRegion().getByRole('button', { name: label });
  }

  addButton(catalog: DriverCatalog): Locator {
    return catalog === 'category' ? this.addCategoryButton : this.addCertificateButton;
  }

  private listUrlFragment(catalog: DriverCatalog): string {
    return catalog === 'category'
      ? '/papi/v4/settings/driver-categories/'
      : '/papi/v4/settings/driver-certificates/';
  }

  isListResponse(response: Response, catalog: DriverCatalog): boolean {
    return (
      response.request().method() === 'GET' &&
      response.url().includes(this.listUrlFragment(catalog))
    );
  }

  isWriteResponse(
    response: Response,
    catalog: DriverCatalog,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return (
      response.request().method() === method &&
      response.url().includes(this.listUrlFragment(catalog))
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isListResponse(response, 'category') && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.pageHeading).toBeVisible();
    await expect(this.table).toBeVisible();
  }

  async gotoLegacyPath(kind: 'category' | 'certificate') {
    const url = kind === 'category' ? this.legacyCategoryUrl : this.legacyCertificateUrl;
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(this.pageHeading).toBeVisible({ timeout: 15000 });
  }

  expectLandedOnDriverPage() {
    return expect(this.page).toHaveURL(/\/settings\/driver\/?(\?|$)/);
  }

  bodyRows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  rowByName(name: string | RegExp): Locator {
    return this.bodyRows().filter({ hasText: name });
  }

  async expectRowVisible(name: string | RegExp) {
    await expect(this.rowByName(name).first()).toBeVisible();
  }

  async expectRowHidden(name: string) {
    await expect(this.rowByName(name)).toHaveCount(0);
  }

  async expectColumns() {
    await expect(this.table.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(this.table.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    await expect(this.table.getByRole('columnheader', { name: 'Action' })).toBeVisible();
  }

  async selectTab(catalog: DriverCatalog) {
    const tab = catalog === 'category' ? this.categoryTab : this.certificateTab;
    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click();
    }
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(this.addButton(catalog)).toBeVisible();
    await expect(this.table).toBeVisible();
  }

  async expectCertificateTabLive() {
    await this.selectTab('certificate');
    await expect(this.table).toBeVisible();
    await this.expectColumns();
    await expect(this.page.getByText(/coming soon/i)).toHaveCount(0);
  }

  async expandSearchIfNeeded(catalog: DriverCatalog) {
    const region = this.searchRegion();
    if ((await region.getAttribute('aria-expanded')) === 'true') {
      await expect(this.searchInput(catalog)).toBeVisible();
      return;
    }
    await this.searchExpandButton(catalog).click();
    await expect(region).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    await expect(this.searchInput(catalog)).toBeVisible();
  }

  async search(catalog: DriverCatalog, term: string) {
    await this.expandSearchIfNeeded(catalog);
    const input = this.searchInput(catalog);
    const list = this.page.waitForResponse(
      (response) =>
        this.isListResponse(response, catalog) &&
        /[?&]search=/.test(response.url()) &&
        response.ok(),
      { timeout: 30000 }
    );
    await input.click();
    await input.fill('');
    await input.pressSequentially(term, { delay: 40 });
    await list;
  }

  async openCreate(catalog: DriverCatalog) {
    await this.addButton(catalog).click();
    await expect(this.formDialog(catalog)).toBeVisible();
    const title = catalog === 'category' ? 'Add driver category' : 'Add driver certificate';
    await expect(this.formDialog(catalog).getByRole('heading', { name: title })).toBeVisible();
  }

  async openEditByName(catalog: DriverCatalog, name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.formDialog(catalog)).toBeVisible();
    const title = catalog === 'category' ? 'Edit driver category' : 'Edit driver certificate';
    await expect(this.formDialog(catalog).getByRole('heading', { name: title })).toBeVisible();
  }

  async fillForm(
    catalog: DriverCatalog,
    data: { name?: string; description?: string }
  ) {
    if (data.name != null) {
      await this.nameInput(catalog).fill(data.name);
    }
    if (data.description != null) {
      await this.descriptionInput(catalog).fill(data.description);
    }
  }

  async saveFormExpecting(
    catalog: DriverCatalog,
    method: 'POST' | 'PUT',
    expectedStatus: number
  ) {
    const expectSuccess = expectedStatus === 201 || expectedStatus === 200;
    const write = this.page.waitForResponse(
      (response) =>
        this.isWriteResponse(response, catalog, method) && response.status() === expectedStatus,
      { timeout: 30000 }
    );
    const list = expectSuccess
      ? this.page.waitForResponse(
          (response) => this.isListResponse(response, catalog) && response.ok(),
          { timeout: 30000 }
        )
      : null;
    await this.saveButton(catalog).click();
    const writeResponse = await write;
    if (expectSuccess && list) {
      await list.catch(() => undefined);
      await expect(this.formDialog(catalog)).toBeHidden({ timeout: 15000 });
    }
    return writeResponse;
  }

  async saveFormExpectingClientValidation(catalog: DriverCatalog) {
    await this.saveButton(catalog).click();
    await expect(this.formDialog(catalog)).toBeVisible();
  }

  async openDeleteByName(catalog: DriverCatalog, name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog(catalog)).toBeVisible();
  }

  async confirmDelete(catalog: DriverCatalog, expectedStatus = 204) {
    const del = this.page.waitForResponse(
      (response) =>
        this.isWriteResponse(response, catalog, 'DELETE') && response.status() === expectedStatus,
      { timeout: 30000 }
    );
    const list =
      expectedStatus === 204
        ? this.page.waitForResponse(
            (response) => this.isListResponse(response, catalog) && response.ok(),
            { timeout: 30000 }
          )
        : null;
    await this.deleteDialog(catalog).getByRole('button', { name: 'Delete', exact: true }).click();
    await del;
    if (list) {
      await list.catch(() => undefined);
      await expect(this.deleteDialog(catalog)).toBeHidden({ timeout: 15000 });
    }
  }

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10000 });
  }

  async expectCreatedToast(catalog: DriverCatalog) {
    const text =
      catalog === 'category' ? 'Driver category created' : 'Driver certificate created';
    await this.expectToast(text);
  }

  async expectUpdatedToast(catalog: DriverCatalog) {
    const text =
      catalog === 'category' ? 'Driver category updated' : 'Driver certificate updated';
    await this.expectToast(text);
  }

  async expectDeletedToast(name: string) {
    await this.expectToast(`"${name}" deleted`);
  }

  async expectDriverMenuEnabledAndVehicleDisabled() {
    const settingsNav = this.page
      .getByRole('navigation')
      .filter({ has: this.categoriesHeading });
    await expect(this.categoriesHeading).toBeVisible();
    await expect(this.driverMenuLink).toBeVisible();
    await expect(settingsNav.getByRole('link', { name: /^Vehicle$/ })).toHaveCount(0);
    await expect(settingsNav.getByText('Vehicle', { exact: true })).toBeVisible();
  }

  /** Rows-per-page Select — PrimeVue Paginator exposes aria-label "Rows per page". */
  rowsPerPageTrigger(): Locator {
    return this.page.getByRole('combobox', { name: /rows per page/i });
  }

  async selectPerPage(catalog: DriverCatalog, rows: 10 | 25 | 50) {
    const sizes = [10, 25, 50] as const;
    const trigger = this.rowsPerPageTrigger();
    await expect(trigger).toBeVisible();
    const current = Number((await trigger.innerText()).trim()) as (typeof sizes)[number];
    if (current === rows) {
      return;
    }

    const from = sizes.indexOf(current);
    const to = sizes.indexOf(rows);
    if (from < 0 || to < 0) {
      throw new Error(`Unexpected rows-per-page value "${current}"`);
    }

    await trigger.click();
    await expect(this.page.getByRole('listbox')).toBeVisible();

    const list = this.page.waitForResponse(
      (response) =>
        this.isListResponse(response, catalog) &&
        response.url().includes(`per_page=${rows}`) &&
        response.ok(),
      { timeout: 8000 }
    );
    // Keep focus on the combobox — focusing an overlay option closes it via blur.
    const key = to > from ? 'ArrowDown' : 'ArrowUp';
    for (let step = 0; step < Math.abs(to - from); step += 1) {
      await trigger.press(key);
    }
    await trigger.press('Enter');
    await expect(this.page.getByRole('listbox')).toBeHidden();
    await expect(trigger).toHaveText(String(rows));
    // Vue Query serves a previously fetched page size from cache — no new GET.
    await list.catch(() => undefined);
  }

  async expectRowsPerPage(rows: 10 | 25 | 50) {
    await expect(this.rowsPerPageTrigger()).toHaveText(String(rows));
    if (rows === 10) {
      await expect(this.bodyRows()).toHaveCount(10);
      return;
    }
    await expect
      .poll(async () => this.bodyRows().count())
      .toBeGreaterThan(10);
  }

  async goToPage(catalog: DriverCatalog, pageNumber: number) {
    const list = this.page.waitForResponse(
      (response) =>
        this.isListResponse(response, catalog) &&
        response.url().includes(`page=${pageNumber}`) &&
        response.ok(),
      { timeout: 30000 }
    );
    const pageButton = this.page.getByRole('button', {
      name: new RegExp(`^(Page )?${pageNumber}$`, 'i'),
    });
    await pageButton.click();
    await list;
  }

  currentPageButton(): Locator {
    return this.page.getByRole('button', { pressed: true });
  }
}
