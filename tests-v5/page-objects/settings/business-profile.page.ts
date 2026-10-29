import { Page, Locator, expect } from '@playwright/test';
import { InvoicePrefixUnavailableError } from '../../helpers/settings/business-profile-api.helper';
import { routes } from '../../helpers/v5-routes';

export class BusinessProfilePage {
  readonly page: Page;

  // Navigation
  readonly settingsProfileUrl = routes.settings.profile();
  /** Another V5 module route — use instead of `page.goto('/')` which can hit the legacy root and drop session. */
  readonly awayPageUrl = routes.hr.employees.list();

  // Business Profiles section
  readonly searchInput: Locator;
  readonly addButton: Locator;
  readonly dataTable: Locator;
  readonly tableRows: Locator;
  readonly emptyMessage: Locator;

  // Dialog
  readonly dialog: Locator;
  readonly dialogHeader: Locator;
  readonly cancelButton: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly saveButton: Locator;
  readonly updateButton: Locator;

  // Profile Tab (Step 1)
  readonly nameInput: Locator;
  readonly vatNoInput: Locator;
  readonly emailInput: Locator;
  readonly addressInput: Locator;
  readonly currencyDropdown: Locator;
  readonly logoUploadInput: Locator;
  readonly logoPreview: Locator;
  readonly removeLogoButton: Locator;
  // Profile Tab — extra contact / identity fields
  readonly countryPrefixInput: Locator;
  readonly phoneInput: Locator;
  readonly faxInput: Locator;

  // Accounting Tab (Step 3) — non-conditional banking / reference fields
  readonly ibanInput: Locator;
  readonly swiftInput: Locator;
  readonly accountNumberInput: Locator;
  readonly webPageInput: Locator;
  readonly companyNumberInput: Locator;

  // Planning Tab (Step 4)
  readonly boardingTimeInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Section elements
    this.searchInput = page.getByPlaceholder('Search business profiles');
    this.addButton = page.getByRole('button', { name: 'Add business profile' });
    this.dataTable = page.locator('.p-datatable');
    this.tableRows = page.locator('.p-datatable-tbody tr');
    this.emptyMessage = page.getByText('No business profiles found.');

    // Dialog elements — scope to business profile modal only (page has other .p-dialog nodes)
    this.dialog = page.getByRole('dialog', {
      name: /Add new business profile|Edit business profile/,
    });
    this.dialogHeader = this.dialog.locator('.p-dialog-header');
    this.cancelButton = this.dialog.getByRole('button', { name: 'Cancel' });
    this.nextButton = this.dialog.getByRole('button', { name: 'Next', exact: true });
    this.backButton = this.dialog.getByRole('button', { name: 'Back' });
    this.saveButton = this.dialog.getByRole('button', { name: 'Save' });
    this.updateButton = this.dialog.getByRole('button', { name: 'Update' });

    // Profile Tab form fields (scoped to dialog when open)
    this.nameInput = this.dialog.locator('input#name, input[name="name"]');
    this.vatNoInput = this.dialog.locator('input#vatNo, input[name="vatNo"]');
    this.emailInput = this.dialog.locator('input#email, input[name="email"]');
    this.addressInput = this.dialog.locator('input#address, input[name="address"]');
    this.currencyDropdown = this.dialog.locator('[data-pc-name="select"]').first();
    this.logoUploadInput = this.dialog.locator('input[type="file"]');
    this.logoPreview = this.dialog.locator('img[alt*="logo"], img[alt*="Logo"]');
    this.removeLogoButton = this.dialog.getByRole('button', { name: /remove|clear/i });

    // Profile Tab — extra contact / identity fields
    this.countryPrefixInput = this.dialog.locator('input#countryPrefix, input[name="countryPrefix"]');
    // VueTelInput renders inner <input id="phone"> and <input id="fax">
    this.phoneInput = this.dialog.locator('input#phone');
    this.faxInput = this.dialog.locator('input#fax');

    // Accounting Tab — non-conditional banking / reference fields
    this.ibanInput = this.dialog.locator('input#iban, input[name="iban"]');
    this.swiftInput = this.dialog.locator('input#swift, input[name="swift"]');
    this.accountNumberInput = this.dialog.locator('input#accountNumber, input[name="accountNumber"]');
    this.webPageInput = this.dialog.locator('input#webPage, input[name="webPage"]');
    this.companyNumberInput = this.dialog.locator('input#companyNumber, input[name="companyNumber"]');

    // Planning Tab
    this.boardingTimeInput = this.dialog.locator(
      'input#disembarkationBoardingTime, input[name="disembarkationBoardingTime"]'
    );
  }

  private editDialog(): Locator {
    return this.page.getByRole('dialog', { name: 'Edit business profile' });
  }

  private profileDialogShell(): Locator {
    return this.page.locator('.p-dialog').filter({
      has: this.page.locator('.p-dialog-header', {
        hasText: /Add new business profile|Edit business profile/,
      }),
    });
  }

  private async typeIntoField(locator: Locator, value: string) {
    await locator.click();
    await locator.fill('');
    await locator.pressSequentially(value, { delay: 15 });
    await locator.blur();
  }

  private async waitForProfileStepValid() {
    await expect
      .poll(async () => (await this.getDialogValidationErrors()).length === 0, {
        timeout: 10000,
      })
      .toBe(true);
  }

  private async getDialogValidationErrors(): Promise<string[]> {
    const errors = this.profileDialogShell().locator('small.text-red-500');
    const messages: string[] = [];
    const count = await errors.count();
    for (let i = 0; i < count; i++) {
      const text = (await errors.nth(i).textContent())?.trim() ?? '';
      if (text && text !== '*') {
        messages.push(text);
      }
    }
    return messages;
  }

  private waitForBillingProfileDetailResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        /billing-profiles\/\d+/.test(response.url()) &&
        response.status() === 200,
      { timeout: 30000 }
    );
  }

  private waitForBillingProfileWriteResponse(method: 'POST' | 'PUT' | 'DELETE') {
    return this.page.waitForResponse(
      (response) =>
        response.request().method() === method &&
        /billing-profiles\/\d+/.test(response.url()),
      { timeout: 30000 }
    );
  }

  private async ensureEditFormValidForSave() {
    await this.editDialog().getByRole('tab', { name: 'Profile' }).click();

    await this.editDialog().getByRole('tab', { name: 'Accounting' }).click();
    await this.dialog.getByText(/^Invoice prefix/).waitFor({ state: 'visible' });
    const invoicePrefixText = ((await this.invoiceNumberSeriesSelect().textContent()) ?? '').trim();
    if (invoicePrefixText === '' || invoicePrefixText === 'Select') {
      await this.selectInvoicePrefix();
    }

    await this.editDialog().getByRole('tab', { name: 'Profile' }).click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  private async waitForEditFormReady() {
    await this.editDialog().waitFor({ state: 'visible' });
    await expect(this.updateButton).toBeVisible();
    await expect(this.updateButton).toBeEnabled();
    await expect(this.vatNoInput).not.toBeEmpty();
  }

  private waitForBillingProfilesListResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() === 200,
      { timeout: 30000 }
    );
  }

  async goto() {
    const listPromise = this.waitForBillingProfilesListResponse();
    await this.page.goto(this.settingsProfileUrl);
    await listPromise;
    await this.waitForTableLoaded();
  }

  /** Leave settings for another V5 page while keeping the same authenticated session. */
  async navigateAwayFromPage(): Promise<void> {
    await this.page.goto(this.awayPageUrl);
    await this.page.waitForURL(/\/v5\/hr\/employee/, { timeout: 30000 });

    const url = this.page.url();
    if (/auth0|\/login/i.test(url)) {
      throw new Error(
        `Session lost navigating to ${this.awayPageUrl} (landed on ${url}). Run with tests config and .auth/user.json.`
      );
    }

    await this.page.locator('.p-datatable').first().waitFor({ state: 'visible', timeout: 30000 });
  }

  async waitForTableLoaded() {
    await this.dataTable.waitFor({ state: 'visible' });
    await this.page
      .locator('.p-datatable-loading-overlay')
      .waitFor({ state: 'hidden' })
      .catch(() => {});
  }

  async getRowCount(): Promise<number> {
    await this.waitForTableLoaded();
    return this.tableRows.count();
  }

  async searchProfiles(term: string) {
    const searchPromise = this.waitForBillingProfilesListResponse();
    await this.searchInput.fill(term);
    await searchPromise;
    await this.waitForTableLoaded();
  }

  async clearSearch() {
    const searchPromise = this.waitForBillingProfilesListResponse();
    await this.searchInput.fill('');
    await searchPromise;
    await this.waitForTableLoaded();
  }

  private profileRowByName(name: string): Locator {
    return this.tableRows.filter({
      has: this.page.getByText(name, { exact: true }),
    });
  }

  async profileExistsInTable(name: string): Promise<boolean> {
    await this.waitForTableLoaded();
    return (await this.profileRowByName(name).count()) > 0;
  }

  async getRowIndexByProfileName(name: string): Promise<number> {
    await this.waitForTableLoaded();
    const row = this.profileRowByName(name);
    if ((await row.count()) === 0) {
      return -1;
    }

    return row.first().evaluate((element) => {
      const tbody = element.closest('tbody');
      if (!tbody) {
        return -1;
      }
      return Array.from(tbody.children).indexOf(element);
    });
  }

  async expectProfileInTable(name: string): Promise<void> {
    await this.waitForTableLoaded();
    await expect
      .poll(async () => (await this.getProfileNameInRow(0)) === name, { timeout: 15000 })
      .toBe(true);
  }

  async expectProfileNotInTable(name: string): Promise<void> {
    await this.waitForTableLoaded();
    await expect
      .poll(async () => this.profileExistsInTable(name), { timeout: 15000 })
      .toBe(false);
  }

  async expectLoadedProfileName(name: string): Promise<void> {
    await expect(this.nameInput).toHaveValue(name);
  }

  // --- Add / Create flow ---

  async openAddDialog() {
    await this.addButton.click();
    await this.dialog.waitFor({ state: 'visible' });
  }

  async fillProfileTab(data: {
    name: string;
    vatNo: string;
    email?: string;
    address?: string;
  }) {
    await this.typeIntoField(this.nameInput, data.name);
    await this.typeIntoField(this.vatNoInput, data.vatNo);
    if (data.email) {
      await this.typeIntoField(this.emailInput, data.email);
    }
    if (data.address) {
      await this.typeIntoField(this.addressInput, data.address);
    }
    await this.waitForProfileStepValid();
  }

  /** Fill all non-conditional Profile tab fields (name, VAT, address, email, country prefix, phone, fax). */
  async fillProfileTabFull(data: {
    name: string;
    vatNo: string;
    address?: string;
    email?: string;
    countryPrefix?: string;
    phone?: string;
    fax?: string;
  }) {
    await this.typeIntoField(this.nameInput, data.name);
    await this.typeIntoField(this.vatNoInput, data.vatNo);
    if (data.address) await this.typeIntoField(this.addressInput, data.address);
    if (data.email) await this.typeIntoField(this.emailInput, data.email);
    if (data.countryPrefix) await this.typeIntoField(this.countryPrefixInput, data.countryPrefix);
    if (data.phone) await this.typeIntoField(this.phoneInput, data.phone);
    if (data.fax) await this.typeIntoField(this.faxInput, data.fax);
    await this.waitForProfileStepValid();
  }

  /** Fill Accounting tab banking and reference fields (no conditional fields — invoice prefix handled separately). */
  async fillAccountingNonConditional(data: {
    iban?: string;
    swift?: string;
    accountNumber?: string;
    webPage?: string;
    companyNumber?: string;
  }) {
    if (data.iban) await this.ibanInput.fill(data.iban);
    if (data.swift) await this.swiftInput.fill(data.swift);
    if (data.accountNumber) await this.accountNumberInput.fill(data.accountNumber);
    if (data.webPage) await this.webPageInput.fill(data.webPage);
    if (data.companyNumber) await this.companyNumberInput.fill(data.companyNumber);
  }

  /** Fill the Planning tab boarding time (minutes). */
  async fillBoardingTime(minutes: string) {
    await this.boardingTimeInput.fill(minutes);
  }

  /**
   * Full create flow: all non-conditional fields across all four steps.
   * Profile (all general fields) → Sales (no tree picker) → Accounting (invoice prefix + banking) → Planning (boarding time).
   */
  async completeCreateFlowFull(data: {
    name: string;
    vatNo: string;
    address?: string;
    email?: string;
    countryPrefix?: string;
    phone?: string;
    fax?: string;
    accounting?: {
      iban?: string;
      swift?: string;
      accountNumber?: string;
      webPage?: string;
      companyNumber?: string;
    };
    boardingTime?: string;
  }) {
    await this.openAddDialog();
    await this.fillProfileTabFull(data);
    await this.clickThroughCreateStepper();

    if (data.accounting) {
      await this.fillAccountingNonConditional(data.accounting);
    }
    if (data.boardingTime) {
      await this.fillBoardingTime(data.boardingTime);
    }

    const createPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickSave();
    await createPromise;
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  private visibleDialog(): Locator {
    return this.profileDialogShell();
  }

  async clickNext() {
    await this.profileDialogShell().getByRole('button', { name: 'Next', exact: true }).click();
  }

  async clickBack() {
    await this.profileDialogShell().getByRole('button', { name: 'Back' }).click();
  }

  async clickSave() {
    await this.profileDialogShell().getByRole('button', { name: 'Save' }).click();
  }

  async clickUpdate() {
    await this.profileDialogShell().getByRole('button', { name: 'Update' }).click();
  }

  async clickCancel() {
    const cancel = this.profileDialogShell().getByRole('button', { name: 'Cancel' });
    if (await cancel.isVisible().catch(() => false)) {
      await cancel.click();
      return;
    }
    await this.page.keyboard.press('Escape');
  }

  /** Close dialog from any stepper step — falls back to Escape when Cancel is not in footer. */
  async closeDialog() {
    const cancelVisible = await this.cancelButton.isVisible().catch(() => false);
    if (cancelVisible) {
      await this.cancelButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  private async selectDropdownByFieldId(fieldId: string) {
    const select = this.dialog
      .locator('.p-select')
      .filter({ has: this.page.locator(`#${fieldId}`) })
      .first();
    await select.click();
    const listbox = this.page
      .locator('.p-popover, .p-select-overlay, [role="listbox"]')
      .last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = listbox.locator('.p-select-option, [role="option"]').first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  private invoiceNumberSeriesSelect(): Locator {
    return this.dialog
      .locator('.p-select')
      .filter({ has: this.page.locator('#invoiceNumberSeries') })
      .first();
  }

  private invoiceSeriesListbox(): Locator {
    return this.page.locator('.p-popover, .p-select-overlay, [role="listbox"]').last();
  }

  async selectInvoicePrefix() {
    const seriesResponse = await this.page.request.get(INVOICE_SERIES_API_PATH, {
      params: { mode: 'create' },
    });
    const seriesBody = seriesResponse.ok() ? await seriesResponse.json() : [];
    const seriesRows = Array.isArray(seriesBody) ? seriesBody : (seriesBody?.data ?? []);
    if (seriesRows.length === 0) {
      throw new InvoicePrefixUnavailableError();
    }

    const accountingTab = this.editDialog().getByRole('tab', { name: 'Accounting' });
    if (await accountingTab.isVisible().catch(() => false)) {
      await accountingTab.click();
    }

    await this.dialog.getByText(/^Invoice prefix/).waitFor({ state: 'visible', timeout: 15000 });

    const combobox = this.dialog.getByRole('combobox', { name: /Invoice prefix/i });
    const select = (await combobox.count()) > 0 ? combobox.first() : this.invoiceNumberSeriesSelect();
    await select.waitFor({ state: 'visible' });
    await select.click();

    const listbox = this.page.getByRole('listbox').last();
    await expect(listbox).toBeVisible({ timeout: 10000 });

    const options = listbox.getByRole('option');
    try {
      await expect.poll(async () => options.count(), { timeout: 15000 }).toBeGreaterThan(0);
    } catch {
      await this.page.keyboard.press('Escape');
      throw new InvoicePrefixUnavailableError();
    }

    await options.first().click();
    await expect(listbox).toBeHidden({ timeout: 5000 }).catch(() => {});

    await expect
      .poll(async () => {
        const label = ((await select.textContent()) ?? '').trim();
        return label.length > 0 && !/^select$/i.test(label);
      }, { timeout: 10000 })
      .toBe(true);
  }

  async clickThroughCreateStepper() {
    // Profile → Sales (create stepper keeps inactive panels in DOM as hidden)
    await this.clickNext();
    await expect(this.profileDialogShell().getByRole('button', { name: 'Back' })).toBeVisible({
      timeout: 15000,
    });
    await this.dialog.getByText('Default sales department').waitFor({ state: 'visible', timeout: 15000 });

    // Sales → Accounting
    await this.clickNext();
    await this.dialog.getByText(/^Invoice prefix/).waitFor({ state: 'visible', timeout: 15000 });
    await this.selectInvoicePrefix();
    const accountingErrors = await this.getDialogValidationErrors();
    if (accountingErrors.length > 0) {
      throw new Error(`Accounting step blocked: ${accountingErrors.join('; ')}`);
    }

    // Accounting → Planning
    await this.clickNext();
    await this.dialog.getByText('Default garage').waitFor({ state: 'visible', timeout: 15000 });
    await expect(this.profileDialogShell().getByRole('button', { name: 'Save' })).toBeVisible({
      timeout: 15000,
    });
  }

  async completeCreateFlow(data: {
    name: string;
    vatNo: string;
    email?: string;
    address?: string;
  }) {
    await this.openAddDialog();
    await this.fillProfileTab(data);
    await this.clickThroughCreateStepper();

    const createPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickSave();
    await createPromise;
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  // --- Edit flow ---

  async openEditDialogForRow(row: Locator) {
    const detailPromise = this.waitForBillingProfileDetailResponse();
    const editButton = row
      .locator('button')
      .filter({ has: this.page.locator('.pi-pen-to-square') });
    await editButton.click();
    await this.editDialog().waitFor({ state: 'visible' });
    await detailPromise;
    await this.waitForEditFormReady();
  }

  async openEditDialog(rowIndex: number = 0) {
    await this.openEditDialogForRow(this.tableRows.nth(rowIndex));
  }

  async openEditDialogByProfileName(name: string) {
    await this.waitForTableLoaded();
    const rowIndex = await this.getRowIndexByProfileName(name);
    if (rowIndex === -1) {
      throw new Error(`Profile "${name}" not found in table for edit`);
    }
    await this.openEditDialog(rowIndex);
  }

  async updateProfileName(newName: string) {
    await this.waitForEditFormReady();
    await this.ensureEditFormValidForSave();
    await this.nameInput.fill(newName);

    const updatePromise = this.waitForBillingProfileWriteResponse('PUT');
    await this.editDialog().getByRole('button', { name: 'Update' }).click();

    let response;
    try {
      response = await updatePromise;
    } catch {
      const errorToast = this.page.locator('.p-toast-message-error');
      if (await errorToast.isVisible()) {
        throw new Error(`Update blocked: ${(await errorToast.textContent())?.trim()}`);
      }
      const validationErrors = await this.getValidationErrors();
      if (validationErrors.length > 0) {
        throw new Error(`Update blocked by validation: ${validationErrors.join('; ')}`);
      }
      throw new Error(
        'Update billing profile did not send a PUT request (likely client-side validation)'
      );
    }

    if (!response.ok()) {
      throw new Error(
        `Update billing profile failed (${response.status()}): ${await response.text()}`
      );
    }

    await this.waitForSuccessToast('updated');
    await this.editDialog().waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  async getProfileNameInRow(rowIndex: number): Promise<string> {
    const nameCell = this.tableRows.nth(rowIndex).locator('td').first();
    return ((await nameCell.locator('span').last().textContent()) ?? '').trim();
  }

  // --- Delete flow ---

  async clickDeleteButton(rowIndex: number) {
    const deleteButton = this.tableRows
      .nth(rowIndex)
      .locator('button')
      .filter({ has: this.page.locator('.pi-trash') });
    await deleteButton.click();
  }

  async isDeleteDisabled(rowIndex: number): Promise<boolean> {
    const deleteButton = this.tableRows
      .nth(rowIndex)
      .locator('button')
      .filter({ has: this.page.locator('.pi-trash') });
    return deleteButton.isDisabled();
  }

  async confirmDelete() {
    const confirmDialog = this.page.locator('.p-confirmdialog, .p-dialog').last();
    const deleteConfirmButton = confirmDialog.getByRole('button', { name: 'Delete' });
    await deleteConfirmButton.click();
  }

  async cancelDelete() {
    const confirmDialog = this.page.locator('.p-confirmdialog, .p-dialog').last();
    const cancelConfirmButton = confirmDialog.getByRole('button', { name: 'Cancel' });
    await cancelConfirmButton.click();
  }

  async deleteProfileByName(name: string) {
    await this.waitForTableLoaded();
    const rowIndex = await this.getRowIndexByProfileName(name);
    if (rowIndex === -1) {
      throw new Error(`Profile "${name}" not found in table for delete`);
    }

    await this.deleteProfileRow(rowIndex);
  }

  /** Best-effort delete — scans paginated table rows; no-op when already gone. */
  async safeDeleteProfileByName(name: string): Promise<void> {
    try {
      await this.clearSearch();
      await this.waitForTableLoaded();

      const deleted = await this.deleteProfileByNameAcrossPages(name);
      if (!deleted) {
        return;
      }
    } catch {
      // Teardown must not mask assertion failures.
    }
  }

  private async deleteProfileByNameAcrossPages(name: string): Promise<boolean> {
    const maxPages = 20;

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
      const rowIndex = await this.getRowIndexByProfileName(name);
      if (rowIndex !== -1) {
        await this.deleteProfileRow(rowIndex);
        return true;
      }

      const advanced = await this.goToNextTablePage();
      if (!advanced) {
        break;
      }
    }

    return false;
  }

  private async goToNextTablePage(): Promise<boolean> {
    const nextButton = this.page.locator('.p-paginator-next');
    if ((await nextButton.count()) === 0 || (await nextButton.isDisabled())) {
      return false;
    }

    const listPromise = this.waitForBillingProfilesListResponse();
    await nextButton.click();
    await listPromise;
    await this.waitForTableLoaded();
    return true;
  }

  private async deleteProfileRow(rowIndex: number): Promise<void> {
    const deletePromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/settings/billing-profiles/') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickDeleteButton(rowIndex);
    await this.confirmDelete();
    await deletePromise;
    await this.waitForSuccessToast('deleted');
    await this.waitForTableLoaded();
  }

  // --- Default profile ---

  async getDefaultProfileRowIndex(): Promise<number> {
    const rows = await this.tableRows.all();
    for (let i = 0; i < rows.length; i++) {
      const shieldIcon = rows[i].locator('.pi-shield');
      if ((await shieldIcon.count()) > 0) {
        return i;
      }
    }
    return -1;
  }

  // --- Dialog state ---

  async isDialogVisible(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async getDialogHeaderText(): Promise<string> {
    return (await this.dialogHeader.textContent()) || '';
  }

  // --- Toasts ---

  async waitForSuccessToast(messageFragment?: string) {
    const toastLocator = messageFragment
      ? this.page.locator('.p-toast-message-success').filter({ hasText: messageFragment })
      : this.page.locator('.p-toast-message-success');
    await toastLocator.waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForErrorToast() {
    await this.page.locator('.p-toast-message-error').waitFor({ state: 'visible', timeout: 10000 });
  }

  // --- Validation ---

  async getValidationErrors(): Promise<string[]> {
    const errors = this.page.locator('small.text-red-500');
    const count = await errors.count();
    const messages: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = (await errors.nth(i).textContent())?.trim() ?? '';
      if (text && text !== '*') {
        messages.push(text);
      }
    }
    return messages;
  }

  // --- Stepper / dialog assertions ---

  async expectCreateStepSalesVisible() {
    await this.dialog.getByText('Default sales department').waitFor({ state: 'visible' });
  }

  async expectCreateStepAccountingVisible() {
    await this.dialog.getByRole('tab', { name: /Accounting/ }).waitFor({ state: 'visible' });
    await this.dialog.getByText(/^Invoice prefix/).waitFor({ state: 'visible' });
  }

  async expectCreateStepPlanningSaveVisible() {
    await this.saveButton.waitFor({ state: 'visible' });
  }

  async submitCreateDialog() {
    await this.clickSave();
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  // --- Logo upload ---

  async uploadLogo(filePath: string) {
    await this.logoUploadInput.setInputFiles(filePath);
  }

  async expectLogoPreviewVisible() {
    await expect(this.logoPreview).toBeVisible();
  }

  // --- Accounting integration ---

  async selectAccountingTool(tool: 'fortnox' | 'tripletex') {
    const toolSelect = this.dialog
      .locator('.p-select')
      .filter({ has: this.page.locator('#accountingTool') })
      .first();
    await toolSelect.click();
    const listbox = this.invoiceSeriesListbox();
    await listbox
      .getByRole('option', { name: tool === 'fortnox' ? 'Fortnox' : 'Tripletex', exact: true })
      .click();
  }

  async fillFortnoxFields(data: { email: string; time: string; day: string }) {
    await this.dialog.locator('#fortnoxEmail').fill(data.email);
    await this.dialog.locator('#fortnoxEmailTime').fill(data.time);
    await this.dialog.locator('#fortnoxEmailDay').fill(data.day);
  }

  async fillTripletexFields(data: { token: string }) {
    await this.dialog.locator('#tripletexEmployeeToken').fill(data.token);
  }

  // --- Tree pickers ---

  async selectDefaultSalesDepartment() {
    await this.selectTreeOption('Default sales department');
  }

  async selectDefaultGarage() {
    await this.selectTreeOption('Default garage');
  }

  private async selectTreeOption(label: string) {
    const trigger = this.dialog.getByLabel(label);
    await trigger.click();
    const panel = this.page.locator('.p-popover, .p-treeselect-panel, [role="tree"]').last();
    await panel.waitFor({ state: 'visible', timeout: 10000 });
    const option = panel.getByRole('treeitem').first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
  }

  // --- UK sort code ---

  async isUkSortCodeVisible(): Promise<boolean> {
    return this.dialog.locator('#sortCode').isVisible();
  }

  async fillSortCode(value: string) {
    await this.dialog.locator('#sortCode').fill(value);
  }

  async expectSortCodeInEdit(value: string) {
    await this.openAccountingTabInEdit();
    await expect(this.dialog.locator('#sortCode')).toHaveValue(value);
  }

  // --- Accounting tab navigation (edit mode) ---

  async openAccountingTabInEdit() {
    await this.editDialog().getByRole('tab', { name: 'Accounting' }).click();
    await this.dialog.getByText(/^Invoice prefix/).waitFor({ state: 'visible' });
  }

  // --- Accounting read-back (edit mode) ---

  async expectFortnoxFieldsInEdit(data: { email: string; time: string; day: string }) {
    await this.openAccountingTabInEdit();
    await expect(this.dialog.locator('#fortnoxEmail')).toHaveValue(data.email);
    await expect(this.dialog.locator('#fortnoxEmailTime')).toHaveValue(data.time);
    await expect(this.dialog.locator('#fortnoxEmailDay')).toHaveValue(data.day);
  }

  async expectTripletexTokenInEdit(token: string) {
    await this.openAccountingTabInEdit();
    await expect(this.dialog.locator('#tripletexEmployeeToken')).toHaveValue(token);
  }

  // --- Tree picker read-back (edit mode) ---

  async expectSalesDeptHasSelectionInEdit() {
    await this.editDialog().getByRole('tab', { name: 'Sales' }).click();
    await this.dialog.getByText('Default sales department').waitFor({ state: 'visible' });
    const labelText = await this.dialog
      .locator('[data-pc-name="treeselect"]')
      .first()
      .locator('[data-pc-section="label"]')
      .textContent();
    expect((labelText ?? '').trim().length).toBeGreaterThan(0);
  }

  async expectGarageHasSelectionInEdit() {
    await this.editDialog().getByRole('tab', { name: 'Planning' }).click();
    await this.dialog.getByText('Default garage').waitFor({ state: 'visible' });
    const labelText = await this.dialog
      .locator('[data-pc-name="treeselect"]')
      .first()
      .locator('[data-pc-section="label"]')
      .textContent();
    expect((labelText ?? '').trim().length).toBeGreaterThan(0);
  }

  // --- Create flow variants ---

  /** Create with company logo uploaded on the Profile step. */
  async completeCreateFlowWithLogo(
    data: { name: string; vatNo: string; email?: string; address?: string },
    logoPath: string
  ) {
    await this.openAddDialog();
    await this.fillProfileTab(data);
    await this.uploadLogo(logoPath);
    await this.clickThroughCreateStepper();

    const createPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickSave();
    await createPromise;
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  /** Create with accounting integration configured on the Accounting step. */
  async completeCreateFlowWithAccounting(
    data: { name: string; vatNo: string; email?: string; address?: string },
    accounting:
      | { tool: 'fortnox'; fields: { email: string; time: string; day: string } }
      | { tool: 'tripletex'; fields: { token: string } }
  ) {
    await this.openAddDialog();
    await this.fillProfileTab(data);

    // Profile → Sales
    await this.clickNext();
    await this.dialog.getByText('Default sales department').waitFor({ state: 'visible' });

    // Sales → Accounting
    await this.clickNext();
    await this.dialog.getByRole('tab', { name: /Accounting/ }).waitFor({ state: 'visible' });
    await this.selectInvoicePrefix();
    await this.selectAccountingTool(accounting.tool);
    if (accounting.tool === 'fortnox') {
      await this.fillFortnoxFields(accounting.fields);
    } else {
      await this.fillTripletexFields(accounting.fields);
    }

    // Accounting → Planning
    await this.clickNext();
    await this.saveButton.waitFor({ state: 'visible' });

    const createPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickSave();
    await createPromise;
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }

  /** Create with default sales department (Sales step) and default garage (Planning step) selected. */
  async completeCreateFlowWithOperationalDefaults(data: {
    name: string;
    vatNo: string;
    email?: string;
    address?: string;
  }) {
    await this.openAddDialog();
    await this.fillProfileTab(data);

    // Profile → Sales
    await this.clickNext();
    await this.dialog.getByText('Default sales department').waitFor({ state: 'visible' });
    await this.selectDefaultSalesDepartment();

    // Sales → Accounting
    await this.clickNext();
    await this.dialog.getByRole('tab', { name: /Accounting/ }).waitFor({ state: 'visible' });
    await this.selectInvoicePrefix();

    // Accounting → Planning
    await this.clickNext();
    await this.saveButton.waitFor({ state: 'visible' });
    await this.selectDefaultGarage();

    const createPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/settings/billing-profiles') &&
        response.status() >= 200 &&
        response.status() < 300,
      { timeout: 30000 }
    );
    await this.clickSave();
    await createPromise;
    await this.waitForSuccessToast('created');
    await this.dialog.waitFor({ state: 'hidden' });
    await this.waitForTableLoaded();
  }
}
