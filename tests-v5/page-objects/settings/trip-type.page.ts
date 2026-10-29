import { Page, Locator, expect, Response } from '@playwright/test';
import { getV5FrontendOrigin, v5PageUrl } from '../../helpers/v5-routes';

/**
 * Page Object for Settings → Categories → Trip type (`/settings/trip-type`).
 */
export class TripTypePage {
  readonly page: Page;
  readonly frontendBase: string;
  readonly pageUrl: string;

  readonly pageHeading: Locator;
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly formDialog: Locator;
  readonly deleteDialog: Locator;
  readonly nameInput: Locator;
  readonly priorityInput: Locator;
  readonly descriptionInput: Locator;
  readonly colorHexInput: Locator;
  readonly clearColorButton: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.frontendBase = getV5FrontendOrigin();
    this.pageUrl = v5PageUrl('/settings/trip-type');

    this.pageHeading = page.getByRole('heading', { name: 'Trip type', exact: true });
    this.searchInput = page.getByPlaceholder('Search list');
    this.addButton = page.getByRole('button', { name: 'Add trip type' });
    this.table = page.getByRole('table');

    this.formDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', {
        name: /Add trip type|Edit trip type|Add subcategory/,
      }),
    });
    this.deleteDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'Delete trip type?' }),
    });

    this.nameInput = this.formDialog.getByLabel(/^Name/);
    this.priorityInput = this.formDialog.getByLabel(/^Priority/);
    this.descriptionInput = this.formDialog.getByLabel(/^Description/);
    this.colorHexInput = this.formDialog.getByPlaceholder('FFFFFF');
    this.clearColorButton = this.formDialog.getByRole('button', { name: 'Clear' });
    this.saveButton = this.formDialog.getByRole('button', { name: 'Save' });
    // Footer labeled Cancel (visible text). Header close only exposes Cancel via aria-label.
    this.cancelButton = this.formDialog
      .getByRole('button', { name: 'Cancel' })
      .filter({ hasText: 'Cancel' });
  }

  private isTripTypesListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/trip-types\/?(\?|$)/.test(response.url())
    );
  }

  private isTripTypesWriteResponse(response: Response, method: 'POST' | 'PUT' | 'DELETE'): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/trip-types/')
    );
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isTripTypesListResponse(response) && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.pageHeading).toBeVisible();
    await expect(this.table).toBeVisible();
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

  async getBodyRowCount(): Promise<number> {
    return this.bodyRows().count();
  }

  async openCreate() {
    await this.addButton.click();
    await expect(this.formDialog).toBeVisible();
    await expect(
      this.formDialog.getByRole('heading', { name: 'Add trip type' })
    ).toBeVisible();
  }

  async openCreateSubcategoryFromFixedTrip() {
    const fixedRow = this.rowByName(/Fixed\s*Trip/i).first();
    await expect(fixedRow).toBeVisible();
    await fixedRow.getByRole('button', { name: 'Add subcategory' }).click();
    await expect(this.formDialog).toBeVisible();
    await expect(
      this.formDialog.getByRole('heading', { name: 'Add subcategory' })
    ).toBeVisible();
  }

  async openEditByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.formDialog).toBeVisible();
    await expect(this.formDialog.getByRole('heading', { name: 'Edit trip type' })).toBeVisible();
  }

  async fillForm(data: {
    name?: string;
    priority?: number;
    description?: string;
    colorHexWithoutHash?: string;
  }) {
    if (data.name != null) {
      await this.nameInput.fill(data.name);
    }
    if (data.priority != null) {
      await this.priorityInput.click();
      await this.priorityInput.fill(String(data.priority));
    }
    if (data.description != null) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.colorHexWithoutHash != null) {
      await this.colorHexInput.fill(data.colorHexWithoutHash);
    }
  }

  async clickPresetColor(hex: string) {
    await this.formDialog.getByRole('button', { name: hex, exact: true }).click();
  }

  async clearColor() {
    await this.clearColorButton.click();
  }

  async saveFormExpecting(method: 'POST' | 'PUT', expectedStatus: number) {
    const expectSuccess = expectedStatus === 201 || expectedStatus === 200;
    const write = this.page.waitForResponse(
      (response) =>
        this.isTripTypesWriteResponse(response, method) && response.status() === expectedStatus,
      { timeout: 30000 }
    );
    const list = expectSuccess
      ? this.page.waitForResponse(
          (response) => this.isTripTypesListResponse(response) && response.ok(),
          { timeout: 30000 }
        )
      : null;
    await this.saveButton.click();
    const writeResponse = await write;
    if (expectSuccess && list) {
      await list.catch(() => undefined);
      await expect(this.formDialog).toBeHidden({ timeout: 15000 });
    }
    return writeResponse;
  }

  async saveFormExpectingClientValidation() {
    await this.saveButton.click();
    await expect(this.formDialog).toBeVisible();
  }

  async openDeleteByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog).toBeVisible();
  }

  async confirmDelete() {
    const del = this.page.waitForResponse(
      (response) => this.isTripTypesWriteResponse(response, 'DELETE') && response.status() === 204,
      { timeout: 30000 }
    );
    const list = this.page.waitForResponse(
      (response) => this.isTripTypesListResponse(response) && response.ok(),
      { timeout: 30000 }
    );
    await this.deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await del;
    await list.catch(() => undefined);
    await expect(this.deleteDialog).toBeHidden({ timeout: 15000 });
  }

  async search(term: string) {
    const list = this.page.waitForResponse(
      (response) =>
        this.isTripTypesListResponse(response) &&
        response.url().includes('search=') &&
        response.ok(),
      { timeout: 30000 }
    );
    await this.searchInput.fill(term);
    await list;
  }

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10000 });
  }

  async expectFixedTripHasAddSubcategory(hasCreatePermission = true) {
    const fixedRow = this.rowByName(/Fixed\s*Trip/i).first();
    await expect(fixedRow).toBeVisible();
    if (hasCreatePermission) {
      await expect(fixedRow.getByRole('button', { name: 'Add subcategory' })).toBeVisible();
    }
  }

  async expectNormalTripHasNoAddSubcategory() {
    const normalRow = this.rowByName(/Normal\s*Trip/i).first();
    await expect(normalRow).toBeVisible();
    await expect(normalRow.getByRole('button', { name: 'Add subcategory' })).toHaveCount(0);
  }

  async expectDefaultRowGuards(name: RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  }

  async expectNameAndPriorityDisabled() {
    await expect(this.nameInput).toBeDisabled();
    await expect(this.priorityInput).toBeDisabled();
  }

  deleteDialogMessage(): Locator {
    return this.deleteDialog.getByRole('paragraph');
  }
}
