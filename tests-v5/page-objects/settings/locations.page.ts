import { expect, Locator, Page } from '@playwright/test';
import { getV5FrontendOrigin, v5PageUrl } from '../../helpers/v5-routes';

/**
 * Settings → Operations → Locations page object.
 *
 * Route: /settings/locations
 * data-testid prefix: loc_*
 */
export class LocationsPage {
  readonly page: Page;
  readonly frontendBase: string;
  readonly locationsUrl: string;

  readonly pageRoot: Locator;
  readonly searchInput: Locator;
  readonly table: Locator;
  readonly emptyState: Locator;
  readonly nameColumnHeader: Locator;
  readonly addressColumnHeader: Locator;
  readonly actionColumnHeader: Locator;
  readonly operationsHeading: Locator;
  readonly locationsMenuItem: Locator;
  readonly pageHeading: Locator;
  readonly subtitle: Locator;
  readonly deleteDialogConfirm: Locator;
  readonly deleteDialogCancel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.frontendBase = getV5FrontendOrigin();
    this.locationsUrl = v5PageUrl('/settings/locations');

    this.pageRoot = page.getByTestId('loc_page');
    this.searchInput = page.getByTestId('loc_search');
    this.table = page.getByTestId('loc_table');
    this.emptyState = page.getByTestId('loc_empty');
    this.nameColumnHeader = page.getByRole('columnheader', { name: /^Name$/i });
    this.addressColumnHeader = page.getByRole('columnheader', { name: /^Address$/i });
    this.actionColumnHeader = page.getByRole('columnheader', { name: /^Action$/i });
    this.operationsHeading = page.getByRole('heading', { name: 'Operations', level: 3 });
    this.locationsMenuItem = page.getByRole('link', { name: 'Locations' }).or(
      page.getByRole('button', { name: 'Locations' })
    );
    this.pageHeading = page.getByRole('heading', { name: 'Locations', level: 2 });
    this.subtitle = page.getByText(
      'View and manage your saved locations. New locations are created during trip planning.'
    );
    this.deleteDialogConfirm = page.getByTestId('loc_delete_confirm');
    this.deleteDialogCancel = page.getByTestId('loc_delete_cancel');
  }

  row(id: number): Locator {
    return this.page.getByTestId(`loc_row_${id}`);
  }

  nameDisplay(id: number): Locator {
    return this.page.getByTestId(`loc_name_${id}`);
  }

  nameInput(id: number): Locator {
    return this.page.getByTestId(`loc_name_input_${id}`);
  }

  nameError(id: number): Locator {
    return this.page.getByTestId(`loc_name_error_${id}`);
  }

  editButton(id: number): Locator {
    return this.page.getByTestId(`loc_edit_btn_${id}`);
  }

  saveButton(id: number): Locator {
    return this.page.getByTestId(`loc_save_btn_${id}`);
  }

  cancelButton(id: number): Locator {
    return this.page.getByTestId(`loc_cancel_btn_${id}`);
  }

  deleteButton(id: number): Locator {
    return this.page.getByTestId(`loc_delete_btn_${id}`);
  }

  successToast(messageFragment?: string): Locator {
    const toast = this.page.getByRole('alert').filter({ hasText: /location/i });
    if (!messageFragment) return toast;
    return this.page.getByRole('alert').filter({ hasText: messageFragment });
  }

  waitForListResponse(search?: string) {
    return this.page.waitForResponse(
      (response) => {
        if (!response.url().includes('/papi/v4/settings/locations/')) return false;
        if (response.request().method() !== 'GET') return false;
        if (search !== undefined) {
          return response.url().includes(`search=${encodeURIComponent(search)}`) ||
            response.url().includes(`search=${search}`);
        }
        return true;
      },
      { timeout: 60000 }
    );
  }

  async goto() {
    const listReady = this.waitForListResponse();
    await this.page.goto(this.locationsUrl);
    await listReady;
    await this.waitForPageLoaded();
  }

  async waitForPageLoaded() {
    await expect(this.pageRoot).toBeVisible({ timeout: 30000 });
    await expect(this.table.or(this.emptyState)).toBeVisible({ timeout: 30000 });
  }

  async search(term: string) {
    const listReady = this.waitForListResponse(term);
    await this.searchInput.fill(term);
    await listReady;
  }

  async clearSearch() {
    const listReady = this.waitForListResponse();
    await this.searchInput.fill('');
    await listReady;
  }

  async startEdit(id: number) {
    await this.editButton(id).click();
    await expect(this.nameInput(id)).toBeVisible();
    await expect(this.nameInput(id)).toBeFocused();
  }

  async fillName(id: number, value: string) {
    await this.nameInput(id).fill(value);
  }

  async saveViaEnter(id: number) {
    const putReady = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/papi/v4/settings/locations/${id}/`) &&
        response.request().method() === 'PUT',
      { timeout: 60000 }
    );
    await this.nameInput(id).press('Enter');
    return putReady;
  }

  async saveViaButton(id: number) {
    const putReady = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/papi/v4/settings/locations/${id}/`) &&
        response.request().method() === 'PUT',
      { timeout: 60000 }
    );
    await this.saveButton(id).click();
    return putReady;
  }

  async cancelViaEscape(id: number) {
    await this.nameInput(id).press('Escape');
    await expect(this.nameInput(id)).toBeHidden();
  }

  async cancelViaButton(id: number) {
    await this.cancelButton(id).click();
    await expect(this.nameInput(id)).toBeHidden();
  }

  async openDeleteDialog(id: number) {
    await this.deleteButton(id).click();
    await expect(this.deleteDialogConfirm).toBeVisible();
  }

  async confirmDelete(id: number) {
    const deleteReady = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/papi/v4/settings/locations/${id}/`) &&
        response.request().method() === 'DELETE',
      { timeout: 60000 }
    );
    await this.deleteDialogConfirm.click();
    return deleteReady;
  }

  async cancelDelete() {
    await this.deleteDialogCancel.click();
    await expect(this.deleteDialogConfirm).toBeHidden();
  }

  async expectRowVisible(id: number) {
    await expect(this.row(id)).toBeVisible();
  }

  async expectRowHidden(id: number) {
    await expect(this.row(id)).toBeHidden();
  }

  async expectName(id: number, name: string) {
    await expect(this.nameDisplay(id)).toHaveText(name);
  }
}
