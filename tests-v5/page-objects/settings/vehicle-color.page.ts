import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/** Settings → Vehicles hub with Vehicle Color tab.
 * Override with `TEQ_V5_VEHICLES_URL` when needed. */
export function vehicleColorSettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_VEHICLES_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || routes.settings.vehicles.vehicleColor();
  return routes.settings.vehicles.vehicleColor();
}

/**
 * Page Object for Settings → Vehicles → Vehicle Color.
 *
 * Create/Edit is a modal dialog (`VehicleColorFormDialog`), not a route —
 * there is no dedicated `/new` or `/:id/edit` path. Delete is FK-protected
 * (blocked with a 400 when a fleet vehicle references the color via
 * `vehicle_color_id` — unlike Vehicle State's guard-less delete). Field is
 * Name only — no sequence, no description, no active toggle.
 */
export class VehicleColorPage {
  readonly page: Page;
  readonly listUrl = vehicleColorSettingsUrl();

  readonly vehicleColorTab: Locator;
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

    this.vehicleColorTab = page.getByRole('tab', { name: 'Vehicle color' });
    this.createButton = page.getByRole('button', { name: 'New vehicle color' });
    this.searchContainer = page.getByRole('search');
    this.searchToggleButton = this.searchContainer.getByRole('button', {
      name: 'Search vehicle colors',
      exact: true,
    });
    this.searchInput = page.getByPlaceholder('Search vehicle colors…');
    this.dataTable = page.getByRole('table');
    this.tableRows = this.dataTable.getByRole('row').filter({ has: page.getByRole('cell') });
    this.emptyMessage = page.getByText('No vehicle colors found.');

    this.createHeading = page.getByRole('heading', { name: 'New vehicle color' });
    this.editHeading = page.getByRole('heading', { name: 'Edit vehicle color' });
    // FormInput appends a required marker to the label text itself (accessible
    // name is literally "Name *"), same convention confirmed for Vehicle
    // State/Category's FormInput fields.
    this.nameInput = page.getByLabel('Name *', { exact: true });
    this.saveButton = page.getByRole('button', { name: 'Save' });
    // Shared by the form dialog and the delete dialog — only one is ever mounted at a time.
    this.cancelButton = page.getByRole('button', { name: 'Cancel', exact: true });

    this.deleteDialogHeading = page.getByRole('heading', { name: 'Delete vehicle color' });
    this.deleteDialogConfirmButton = page.getByRole('button', { name: 'Delete', exact: true });
  }

  private isVehicleColorListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/vehicle-colors\/?(\?|$)/.test(response.url())
    );
  }

  private isVehicleColorWriteResponse(response: Response, method: 'POST' | 'PUT' | 'DELETE'): boolean {
    return (
      response.request().method() === method && response.url().includes('/papi/v4/settings/vehicle-colors/')
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isVehicleColorListResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.listUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.vehicleColorTab).toBeVisible();
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
    return this.rowByName(name).getByRole('button', { name: 'Edit vehicle color' });
  }

  deleteButtonInRow(name: string | RegExp): Locator {
    return this.rowByName(name).getByRole('button', { name: 'Delete vehicle color' });
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
        (this.isVehicleColorWriteResponse(response, 'POST') ||
          this.isVehicleColorWriteResponse(response, 'PUT')) &&
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
   * the mutation's `saving` flag disables the button as soon as the first
   * click fires, so this should behave identically to a single successful
   * save (one row created, not two). */
  async dblclickSave() {
    const writeResponse = this.page.waitForResponse(
      (response) => this.isVehicleColorWriteResponse(response, 'POST') && response.status() >= 200 && response.status() < 300,
      { timeout: 30000 }
    );
    await this.saveButton.dblclick();
    await writeResponse;
  }

  async expectCreateSuccessAndReturnToList() {
    // `.first()`: a still-fading earlier toast with the same text can briefly
    // coexist with the new one (PrimeVue toast stacking) — same resolution
    // pattern already used by `waitForSuccessToast` on the Planning vehicle
    // page object, not a weakening of the assertion itself.
    await expect(this.page.getByText('Vehicle color created').first()).toBeVisible();
    await expect(this.vehicleColorTab).toBeVisible();
    await expect(this.createButton).toBeVisible();
  }

  async expectUpdateSuccessAndReturnToList() {
    await expect(this.page.getByText('Vehicle color updated').first()).toBeVisible();
    await expect(this.vehicleColorTab).toBeVisible();
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
        this.isVehicleColorWriteResponse(response, 'DELETE') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.deleteDialogConfirmButton.click();
    await deleteResponse;
  }

  async expectDeleteSuccessToast() {
    await expect(this.page.getByText('Vehicle color deleted successfully.')).toBeVisible();
  }
}
