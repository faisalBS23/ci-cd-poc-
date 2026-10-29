import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/** Settings → Vehicles hub (`/settings/vehicles`).
 * Override with `TEQ_V5_VEHICLES_URL` when needed. */
export function vehicleTypeSettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_VEHICLES_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || routes.settings.vehicles.list();
  return routes.settings.vehicles.list();
}

export function vehicleTypeCreateUrl(): string {
  return routes.settings.vehicles.vehicleTypeNew();
}

/**
 * Page Object for Settings → Vehicles → Vehicle Type.
 */
export class VehicleTypePage {
  readonly page: Page;
  readonly listUrl = vehicleTypeSettingsUrl();
  readonly createUrl = vehicleTypeCreateUrl();

  readonly vehicleTypeTab: Locator;
  readonly createButton: Locator;
  readonly searchContainer: Locator;
  readonly searchToggleButton: Locator;
  readonly searchInput: Locator;
  readonly dataTable: Locator;
  readonly tableRows: Locator;
  readonly emptyMessage: Locator;

  readonly createHeading: Locator;
  readonly editHeading: Locator;
  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly maxCapacityInput: Locator;
  readonly tollCategorySelect: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;

  readonly selectionToolbar: Locator;
  readonly selectionEditButton: Locator;
  readonly selectionDeleteButton: Locator;

  readonly deleteDialog: Locator;
  readonly deleteDialogCandidateSelect: Locator;
  readonly deleteDialogConfirmButton: Locator;
  readonly deleteDialogCancelButton: Locator;
  readonly deleteDialogNoCandidatesMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    this.vehicleTypeTab = page.getByRole('tab', { name: 'Vehicle Type' });
    this.createButton = page.getByRole('button', { name: 'New vehicle type' });
    this.searchContainer = page.getByRole('search');
    this.searchToggleButton = this.searchContainer.getByRole('button', {
      name: 'Search vehicle types',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Search vehicle types…');
    this.dataTable = page.getByRole('table');
    this.tableRows = this.dataTable.getByRole('row').filter({ has: page.getByRole('cell') });
    this.emptyMessage = page.getByText('No vehicle types found.');

    this.createHeading = page.getByRole('heading', { name: 'New vehicle type' });
    this.editHeading = page.getByRole('heading', { name: 'Edit vehicle type' });
    this.nameInput = page.getByLabel(/^Internal name/);
    this.descriptionInput = page.getByLabel(/^Description/);
    this.maxCapacityInput = page.getByLabel(/^Max\. pax match/);
    this.tollCategorySelect = page
      .getByText(/^Toll category/)
      .locator('..')
      .getByRole('combobox');
    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.discardButton = page.getByRole('button', { name: 'Discard' });

    this.selectionToolbar = page.getByRole('toolbar', { name: 'Selected vehicle types actions' });
    this.selectionEditButton = this.selectionToolbar.getByRole('button', { name: 'Edit' });
    this.selectionDeleteButton = this.selectionToolbar.getByRole('button', { name: 'Delete' });

    this.deleteDialog = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('heading', { name: 'Delete vehicle type' }) });
    this.deleteDialogCandidateSelect = this.deleteDialog
      .getByText(/^Replace with/)
      .locator('..')
      .getByRole('combobox');
    this.deleteDialogConfirmButton = this.deleteDialog.getByRole('button', { name: 'Delete' });
    this.deleteDialogCancelButton = this.deleteDialog.getByRole('button', { name: 'Cancel' });
    this.deleteDialogNoCandidatesMessage = this.deleteDialog.getByText(
      /No other vehicle type available/
    );
  }

  private isVehicleTypeListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/vehicle-types\/?(\?|$)/.test(response.url()) &&
      !response.url().includes('/form-config/')
    );
  }

  private isVehicleTypeWriteResponse(
    response: Response,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/vehicle-types/')
    );
  }

  private isFormConfigResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      response.url().includes('/vehicle-types/form-config/')
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isVehicleTypeListResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.listUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.vehicleTypeTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async waitForTableLoaded() {
    await expect(this.dataTable).toBeVisible();
    await expect(this.bodyRows().first().or(this.emptyMessage)).toBeVisible({ timeout: 30000 });
  }

  /** Expands the collapsible search (its input is `inert` until opened) and
   * fills it. Callers assert the resulting rows with web-first `expect(...)`
   * (auto-retrying) rather than waiting for a network response here: results
   * for a term searched earlier in the same test can come straight from the
   * app's 30s query cache with no new request (`core/plugins/vueQuery.ts`). */
  async search(term: string) {
    const isExpanded = (await this.searchContainer.getAttribute('aria-expanded')) === 'true';
    if (!isExpanded) {
      await this.searchToggleButton.click();
    }
    await this.searchInput.fill(term);
  }

  bodyRows(): Locator {
    return this.tableRows;
  }

  nameCellInRow(rowIndex: number): Locator {
    return this.bodyRows().nth(rowIndex).getByRole('cell').nth(1);
  }

  async getRowCount(): Promise<number> {
    await this.waitForTableLoaded();
    return this.bodyRows().count();
  }

  rowByName(name: string | RegExp): Locator {
    return this.bodyRows().filter({ hasText: name });
  }

  async getNameInRow(rowIndex: number): Promise<string> {
    const cell = this.nameCellInRow(rowIndex);
    return ((await cell.textContent()) || '').trim();
  }

  async expectRowVisible(name: string | RegExp) {
    await expect(this.rowByName(name).first()).toBeVisible();
  }

  async expectRowHidden(name: string) {
    await expect(this.rowByName(name)).toHaveCount(0);
  }

  async openCreate() {
    const configResponse = this.page.waitForResponse(
      (response) => this.isFormConfigResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.createButton.click();
    await expect(this.createHeading).toBeVisible();
    await configResponse;
    await this.waitForCreateFormReady();
  }

  async waitForCreateFormReady() {
    await expect(this.nameInput).toBeVisible();
  }

  async fillMinimumCreateForm(data: {
    name: string;
    description?: string;
    maxCapacity?: number;
    tollOption?: 'Small car' | 'Big car';
  }) {
    await this.nameInput.fill(data.name);
    await this.descriptionInput.fill(data.description ?? `${data.name} test description`);
    await this.maxCapacityInput.click();
    await this.maxCapacityInput.fill(String(data.maxCapacity ?? 10));
    await this.selectTollCategory(data.tollOption ?? 'Small car');
  }

  async selectTollCategory(option: 'Small car' | 'Big car') {
    const current = ((await this.tollCategorySelect.textContent()) || '').trim();
    if (current === option) {
      return;
    }
    await this.tollCategorySelect.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async fillAllPriceFactorRates(rate = 1) {
    const priceHeading = this.page.getByRole('heading', { name: 'Price settings' });
    await expect(priceHeading).toBeVisible();
    const priceTable = priceHeading.locator('..').getByRole('table');
    const rows = priceTable.getByRole('row').filter({ has: this.page.getByRole('spinbutton') });
    const rowCount = await rows.count();

    for (let i = 0; i < rowCount; i++) {
      const input = rows.nth(i).getByRole('spinbutton').first();
      await input.fill(String(rate));
    }
  }

  async saveForm() {
    const writeResponse = this.page.waitForResponse(
      (response) =>
        (this.isVehicleTypeWriteResponse(response, 'POST') ||
          this.isVehicleTypeWriteResponse(response, 'PUT')) &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.saveButton.click();
    await writeResponse;
  }

  async expectCreateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle type created')).toBeVisible();
    await expect(this.vehicleTypeTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async completeMinimumCreate(data: {
    name: string;
    description?: string;
    maxCapacity?: number;
    tollOption?: 'Small car' | 'Big car';
    priceFactorRate?: number;
  }) {
    await this.openCreate();
    await this.fillMinimumCreateForm(data);
    await this.fillAllPriceFactorRates(data.priceFactorRate ?? 1);
    await this.saveForm();
    await this.expectCreateSuccessAndReturnToList();
  }

  async selectRowByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await row.getByRole('checkbox').click({ force: true });
  }

  /** Re-opening edit for the same id within the app's 30s query cache
   * (`core/plugins/vueQuery.ts`) is a cache hit with no new request, so this
   * waits on UI state (web-first `expect`) rather than a detail-GET response. */
  async openEditForSelectedRow() {
    await this.selectionEditButton.click();
    await expect(this.editHeading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async updateBasicFields(data: { name?: string; description?: string; maxCapacity?: number }) {
    if (data.name !== undefined) {
      // `.click()` before `.fill()` arms the field's dirty-tracking (some
      // builds only mark a field dirty after a real pointer/key interaction,
      // not a bare programmatic `.fill()`) — required for Save to enable.
      await this.nameInput.click();
      await this.nameInput.fill(data.name);
    }
    if (data.description !== undefined) {
      await this.descriptionInput.click();
      await this.descriptionInput.fill(data.description);
    }
    if (data.maxCapacity !== undefined) {
      await this.maxCapacityInput.click();
      await this.maxCapacityInput.fill(String(data.maxCapacity));
    }
  }

  async expectUpdateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle type updated')).toBeVisible();
    await expect(this.vehicleTypeTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async discardForm() {
    await this.discardButton.click();
    await expect(this.vehicleTypeTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async openDeleteForSelectedRows() {
    await this.selectionDeleteButton.click();
    await expect(this.deleteDialog).toBeVisible();
  }

  async selectDeleteCandidate(name: string) {
    await this.deleteDialogCandidateSelect.click();
    await this.page.getByRole('option', { name }).click();
  }

  async confirmDelete() {
    const deleteResponse = this.page.waitForResponse(
      (response) =>
        this.isVehicleTypeWriteResponse(response, 'DELETE') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.deleteDialogConfirmButton.click();
    await deleteResponse;
  }

  async expectDeleteSuccessToast() {
    await expect(this.page.getByText('Vehicle type deleted')).toBeVisible();
  }
}
