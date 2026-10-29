import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/** Settings → Vehicles hub with Vehicle Category tab.
 * Override with `TEQ_V5_VEHICLES_URL` when needed. */
export function vehicleCategorySettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_VEHICLES_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || routes.settings.vehicles.vehicleCategory();
  return routes.settings.vehicles.vehicleCategory();
}

/**
 * Page Object for Settings → Vehicles → Vehicle Category.
 *
 * Create/Edit is a modal dialog (`VehicleCategoryFormDialog`), not a route —
 * there is no dedicated `/new` or `/:id/edit` path. Delete is a simple confirm
 * dialog with no candidate transfer (v3 parity, simpler than Vehicle Type).
 */
export class VehicleCategoryPage {
  readonly page: Page;
  readonly listUrl = vehicleCategorySettingsUrl();

  readonly vehicleCategoryTab: Locator;
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
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  readonly deleteDialogHeading: Locator;
  readonly deleteDialogConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.vehicleCategoryTab = page.getByRole('tab', { name: 'Vehicle Category' });
    this.createButton = page.getByRole('button', { name: 'New vehicle category' });
    this.searchContainer = page.getByRole('search');
    this.searchToggleButton = this.searchContainer.getByRole('button', {
      name: 'Search vehicle categories',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Search vehicle categories…');
    this.dataTable = page.getByRole('table');
    this.tableRows = this.dataTable.getByRole('row').filter({ has: page.getByRole('cell') });
    this.emptyMessage = page.getByText('No vehicle categories found.');

    this.createHeading = page.getByRole('heading', { name: 'New vehicle category' });
    this.editHeading = page.getByRole('heading', { name: 'Edit vehicle category' });
    // FormInput/FormTextarea append a required marker to the label text itself
    // (accessible name is literally "Name *" / "Description *"), confirmed via
    // a local run's DOM snapshot — `exact: true` against the bare word never matches.
    this.nameInput = page.getByLabel('Name *', { exact: true });
    this.descriptionInput = page.getByLabel('Description *', { exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    // Shared by the form dialog and the delete dialog — only one is ever mounted at a time.
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.deleteDialogHeading = page.getByRole('heading', { name: 'Delete vehicle category' });
    this.deleteDialogConfirmButton = page.getByRole('button', { name: 'Delete', exact: true });
  }

  private isVehicleCategoryListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/vehicle-categories\/?(\?|$)/.test(response.url())
    );
  }

  private isVehicleCategoryWriteResponse(
    response: Response,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/vehicle-categories/')
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isVehicleCategoryListResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.listUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.vehicleCategoryTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async waitForTableLoaded() {
    await expect(this.dataTable).toBeVisible();
    await expect(this.tableRows.first().or(this.emptyMessage)).toBeVisible({ timeout: 30000 });
  }

  async getRowCount(): Promise<number> {
    await this.waitForTableLoaded();
    return this.tableRows.count();
  }

  rowByName(name: string | RegExp): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  async expectRowVisible(name: string | RegExp) {
    await expect(this.rowByName(name).first()).toBeVisible();
  }

  async expectRowHidden(name: string | RegExp) {
    await expect(this.rowByName(name)).toHaveCount(0);
  }

  editButtonInRow(name: string | RegExp): Locator {
    return this.rowByName(name).getByRole('button', { name: 'Edit vehicle category' });
  }

  deleteButtonInRow(name: string | RegExp): Locator {
    return this.rowByName(name).getByRole('button', { name: 'Delete vehicle category' });
  }

  /** Expands the collapsible search (its input is `inert` until opened) and
   * fills it. Callers assert the resulting rows with web-first `expect(...)`
   * (auto-retrying) rather than waiting for a network response here: results
   * for a term searched earlier in the same test can come straight from the
   * app's query cache with no new request. */
  async search(term: string) {
    const isExpanded = (await this.searchContainer.getAttribute('aria-expanded')) === 'true';
    if (!isExpanded) {
      await this.searchToggleButton.click();
    }
    await this.searchInput.fill(term);
  }

  async openCreate() {
    await this.createButton.click();
    await expect(this.createHeading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async openEditForRow(name: string | RegExp) {
    await this.editButtonInRow(name).click();
    await expect(this.editHeading).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async fillMinimumCreateForm(data: { name: string; description?: string }) {
    await this.nameInput.fill(data.name);
    await this.descriptionInput.fill(data.description ?? `${data.name} test description`);
  }

  async updateDescription(description: string) {
    // `.click()` before `.fill()` arms the field's dirty-tracking (some
    // builds only mark a field dirty after a real pointer/key interaction,
    // not a bare programmatic `.fill()`) — required for Save to enable.
    await this.descriptionInput.click();
    await this.descriptionInput.fill(description);
  }

  async cancelForm() {
    await this.cancelButton.click();
  }

  async saveForm() {
    const writeResponse = this.page.waitForResponse(
      (response) =>
        (this.isVehicleCategoryWriteResponse(response, 'POST') ||
          this.isVehicleCategoryWriteResponse(response, 'PUT')) &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.saveButton.click();
    await writeResponse;
  }

  async expectCreateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle category created')).toBeVisible();
    await expect(this.vehicleCategoryTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async expectUpdateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle category updated')).toBeVisible();
    await expect(this.vehicleCategoryTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async completeMinimumCreate(data: { name: string; description?: string }) {
    await this.openCreate();
    await this.fillMinimumCreateForm(data);
    await this.saveForm();
    await this.expectCreateSuccessAndReturnToList();
  }

  async openDeleteForRow(name: string | RegExp) {
    await this.deleteButtonInRow(name).click();
    await expect(this.deleteDialogHeading).toBeVisible();
  }

  async confirmDelete() {
    const deleteResponse = this.page.waitForResponse(
      (response) =>
        this.isVehicleCategoryWriteResponse(response, 'DELETE') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.deleteDialogConfirmButton.click();
    await deleteResponse;
  }

  async expectDeleteSuccessToast() {
    await expect(this.page.getByText('Vehicle category deleted successfully.')).toBeVisible();
  }
}
