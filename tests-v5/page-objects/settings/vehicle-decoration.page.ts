import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/** Settings → Vehicles hub with Vehicle Decoration tab.
 * Override with `TEQ_V5_VEHICLES_URL` when needed. */
export function vehicleDecorationSettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_VEHICLES_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || routes.settings.vehicles.vehicleDecoration();
  return routes.settings.vehicles.vehicleDecoration();
}

/**
 * Page Object for Settings → Vehicles → Vehicle Decoration.
 *
 * Create/Edit is a modal dialog (`VehicleDecorationFormDialog`), not a
 * route — there is no dedicated `/new` or `/:id/edit` path. Delete is
 * FK-protected (blocked with a 400 when referenced by any of 5 tables —
 * fleet vehicle, customer requirement, trip template, or fixed-trip
 * requirement — a wider guard surface than Vehicle Color's single-table
 * one). Field is Name only — no sequence, no description, no active toggle.
 * Structure mirrors `vehicle-color.page.ts` 1:1 (verified, passing sibling).
 */
export class VehicleDecorationPage {
  readonly page: Page;
  readonly listUrl = vehicleDecorationSettingsUrl();

  readonly vehicleDecorationTab: Locator;
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
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  readonly deleteDialogHeading: Locator;
  readonly deleteDialogConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.vehicleDecorationTab = page.getByRole('tab', { name: 'Vehicle decoration' });
    this.createButton = page.getByRole('button', { name: 'New vehicle decoration' });
    this.searchContainer = page.getByRole('search');
    this.searchToggleButton = this.searchContainer.getByRole('button', {
      name: 'Search vehicle decorations',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Search vehicle decorations…');
    this.dataTable = page.getByRole('table');
    this.tableRows = this.dataTable.getByRole('row').filter({ has: page.getByRole('cell') });
    this.emptyMessage = page.getByText('No vehicle decorations found.');

    this.createHeading = page.getByRole('heading', { name: 'New vehicle decoration' });
    this.editHeading = page.getByRole('heading', { name: 'Edit vehicle decoration' });
    // FormInput appends a required marker to the label text itself (accessible
    // name is literally "Name *"), same convention confirmed for Vehicle
    // State/Category/Color's FormInput fields.
    this.nameInput = page.getByLabel('Name *', { exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    // Shared by the form dialog and the delete dialog — only one is ever mounted at a time.
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.deleteDialogHeading = page.getByRole('heading', { name: 'Delete vehicle decoration' });
    this.deleteDialogConfirmButton = page.getByRole('button', { name: 'Delete', exact: true });
  }

  private isVehicleDecorationListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/vehicle-decorations\/?(\?|$)/.test(response.url())
    );
  }

  private isVehicleDecorationWriteResponse(
    response: Response,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/vehicle-decorations/')
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isVehicleDecorationListResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.listUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.vehicleDecorationTab).toBeVisible();
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
    return this.rowByName(name).getByRole('button', { name: 'Edit vehicle decoration' });
  }

  deleteButtonInRow(name: string | RegExp): Locator {
    return this.rowByName(name).getByRole('button', { name: 'Delete vehicle decoration' });
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

  async fillMinimumCreateForm(data: { name: string }) {
    await this.nameInput.fill(data.name);
  }

  async updateName(name: string) {
    // `.click()` before `.fill()` arms the field's dirty-tracking (some
    // builds only mark a field dirty after a real pointer/key interaction,
    // not a bare programmatic `.fill()`) — required for Save to enable.
    await this.nameInput.click();
    await this.nameInput.fill(name);
  }

  async cancelForm() {
    await this.cancelButton.click();
  }

  /** Clicks Save and waits for a successful (2xx) write response. Only use
   * when the save is expected to succeed — for a validation-rejection path
   * (e.g. blank name), use `clickSave()` instead and assert the inline error
   * with a web-first `expect()`, since a 4xx response never resolves this
   * wait. */
  async saveForm() {
    const writeResponse = this.page.waitForResponse(
      (response) =>
        (this.isVehicleDecorationWriteResponse(response, 'POST') ||
          this.isVehicleDecorationWriteResponse(response, 'PUT')) &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.saveButton.click();
    await writeResponse;
  }

  /** Bare Save click with no response wait — for paths where the outcome
   * (success vs. validation rejection) is exactly what the test is proving. */
  async clickSave() {
    await this.saveButton.click();
  }

  /** Native double-click on Save, to prove double-submission is harmless —
   * or to reproduce it, if it isn't. Vehicle Color's equivalent case found a
   * real duplicate-row bug this way (see `vehicle-color.e2e.spec.ts` /
   * `TEST_MATRIX_SETTINGS.md`); this decoration case exists to check whether
   * the same class of defect exists here too, not to assume either outcome. */
  async dblclickSave() {
    const writeResponse = this.page.waitForResponse(
      (response) =>
        this.isVehicleDecorationWriteResponse(response, 'POST') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.saveButton.dblclick();
    await writeResponse;
  }

  async expectCreateSuccessAndReturnToList() {
    // `.first()`: a still-fading earlier toast with the same text can briefly
    // coexist with the new one (PrimeVue toast stacking) — same resolution
    // pattern already used by Vehicle Color's page object.
    await expect(this.page.getByText('Vehicle decoration created').first()).toBeVisible();
    await expect(this.vehicleDecorationTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async expectUpdateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle decoration updated').first()).toBeVisible();
    await expect(this.vehicleDecorationTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async completeMinimumCreate(data: { name: string }) {
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
        this.isVehicleDecorationWriteResponse(response, 'DELETE') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.deleteDialogConfirmButton.click();
    await deleteResponse;
  }

  async expectDeleteSuccessToast() {
    await expect(this.page.getByText('Vehicle decoration deleted successfully.')).toBeVisible();
  }
}
