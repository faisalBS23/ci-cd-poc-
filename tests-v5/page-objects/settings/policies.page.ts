import { Page, Locator, expect, Response } from '@playwright/test';
import { v5Path } from '../../helpers/v5-routes';

/**
 * Page Object for Settings → Policies (`/settings/policies`).
 * Locators: role/label/text first; existing data-testid when present.
 */
export class PoliciesPage {
  readonly page: Page;
  readonly pageUrl: string;

  readonly pageHeading: Locator;
  readonly cancellationSection: Locator;
  readonly paymentSection: Locator;
  readonly cancellationTable: Locator;
  readonly paymentTable: Locator;
  readonly cancellationAddButton: Locator;
  readonly paymentAddButton: Locator;
  readonly cancellationDefaultBlock: Locator;
  readonly applyDefaultButton: Locator;
  readonly cancellationFormDialog: Locator;
  readonly paymentFormDialog: Locator;
  readonly pickDefaultDialog: Locator;
  readonly assignDialog: Locator;
  readonly deleteDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = v5Path('/settings/policies');

    this.pageHeading = page.getByRole('heading', { name: 'Policies', exact: true });
    this.cancellationSection = page.getByTestId('policies-cancellation-section');
    this.paymentSection = page.getByTestId('policies-payment-section');
    this.cancellationTable = page.getByTestId('policies-cancellation-table');
    this.paymentTable = page.getByTestId('policies-payment-table');
    this.cancellationAddButton = page.getByTestId('policies-cancellation-add');
    this.paymentAddButton = page.getByTestId('policies-payment-add');
    this.cancellationDefaultBlock = page.getByTestId('policies-cancellation-default-block');
    this.applyDefaultButton = page.getByTestId('policies-cancellation-assign-default');

    this.cancellationFormDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', {
        name: /Create cancellation policy|Edit cancellation policy/,
      }),
    });
    this.paymentFormDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', {
        name: /Create payment policy|Edit payment policy/,
      }),
    });
    this.pickDefaultDialog = page.getByTestId('policies-cancellation-pick-default-dialog');
    this.assignDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /Assign customers/ }),
    });
    this.deleteDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', {
        name: /Delete cancellation policy\?|Delete payment policy\?/,
      }),
    });
  }

  private isCancelListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/cancellation-policies\/?(\?|$)/.test(response.url())
    );
  }

  private isPaymentListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/payment-policies\/?(\?|$)/.test(response.url())
    );
  }

  private isCancelWrite(response: Response, method: 'POST' | 'PUT' | 'DELETE'): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/cancellation-policies/')
    );
  }

  private isPaymentWrite(response: Response, method: 'POST' | 'PUT' | 'DELETE'): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/payment-policies/')
    );
  }

  async goto() {
    const cancelList = this.page.waitForResponse(
      (response) => this.isCancelListResponse(response) && response.ok(),
      { timeout: 30000 }
    );
    const paymentList = this.page.waitForResponse(
      (response) => this.isPaymentListResponse(response) && response.ok(),
      { timeout: 30000 }
    );
    await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });
    await Promise.all([cancelList, paymentList]);
    await expect(this.pageHeading).toBeVisible();
  }

  async gotoSoftRedirect(legacyAppPath: string) {
    await this.page.goto(v5Path(legacyAppPath), { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/settings\/policies\/?(\?|$)/);
    await expect(this.pageHeading).toBeVisible({ timeout: 30000 });
  }

  async expectNoPageLevelFloatingSaveDiscard() {
    await expect(this.page.getByRole('button', { name: 'Discard', exact: true })).toHaveCount(0);
  }

  cancellationBodyRows(): Locator {
    return this.cancellationTable.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  paymentBodyRows(): Locator {
    return this.paymentTable.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  /**
   * String names match the name cell exactly so a duplicate
   * (`{name} (Copy)`) is not treated as the original.
   */
  private rowByName(rows: Locator, name: string | RegExp): Locator {
    if (typeof name === 'string') {
      return rows.filter({ has: this.page.getByText(name, { exact: true }) });
    }
    return rows.filter({ hasText: name });
  }

  cancellationRowByName(name: string | RegExp): Locator {
    return this.rowByName(this.cancellationBodyRows(), name);
  }

  paymentRowByName(name: string | RegExp): Locator {
    return this.rowByName(this.paymentBodyRows(), name);
  }

  async expectCancellationRowVisible(name: string | RegExp) {
    await expect(this.cancellationRowByName(name).first()).toBeVisible();
  }

  async expectPaymentRowVisible(name: string | RegExp) {
    await expect(this.paymentRowByName(name).first()).toBeVisible();
  }

  async openCreateCancellation() {
    await this.cancellationAddButton.click();
    await expect(this.cancellationFormDialog).toBeVisible();
  }

  async openCreatePayment() {
    await this.paymentAddButton.click();
    await expect(this.paymentFormDialog).toBeVisible();
  }

  /**
   * Rule/request labels are `sr-only` on desktop and FormSelect `for`/id uses
   * bracketed field names — prefer role-based controls inside the dialog.
   * Fee type / Trigger defaults (Percentage, Order confirmation) are left alone
   * unless a combobox click is required.
   */
  /** Only enabled spinbuttons — days-offset is disabled for Order confirmation. */
  private async fillNthSpinbutton(container: Locator, index: number, value: number) {
    const input = container.getByRole('spinbutton', { disabled: false }).nth(index);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
    await input.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await input.pressSequentially(String(value), { delay: 20 });
    await input.blur();
  }

  private async openComboboxAndChoose(scope: Locator, optionName: string | RegExp) {
    const combobox = scope.getByRole('combobox').first();
    await expect(combobox).toBeVisible();
    await combobox.click();
    const option = this.page.getByRole('option', { name: optionName }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
  }

  async fillCancellationForm(data: {
    name: string;
    hoursBefore?: number;
    feeValue?: number;
  }) {
    const dialog = this.cancellationFormDialog;
    await dialog.getByLabel(/^Policy name/).fill(data.name);
    // spinbuttons: [0]=hoursBefore, [1]=feeValue (fee type is a Select, not a spinbutton)
    if (data.hoursBefore != null) {
      await this.fillNthSpinbutton(dialog, 0, data.hoursBefore);
    }
    if (data.feeValue != null) {
      await this.fillNthSpinbutton(dialog, 1, data.feeValue);
    }
  }

  async fillPaymentForm(data: { name: string; percentage?: number }) {
    const dialog = this.paymentFormDialog;
    await dialog.getByLabel(/^Policy name/).fill(data.name);
    // Default trigger is ORDER_CONFIRMATION — no Select interaction needed.
    if (data.percentage != null) {
      await this.fillNthSpinbutton(dialog, 0, data.percentage);
    }
  }

  async addPaymentRequestRow() {
    await this.paymentFormDialog.getByTestId('policies-payment-add-request').click();
  }

  /** Two request rows whose percentages sum to more than 100 (per-field max is 100). */
  async fillPaymentFormExceedingTotalPercent(name: string) {
    const dialog = this.paymentFormDialog;
    await dialog.getByLabel(/^Policy name/).fill(name);
    // Enabled spinbuttons only = percentage fields (days-offset disabled for default trigger)
    await this.fillNthSpinbutton(dialog, 0, 100);
    await this.addPaymentRequestRow();
    await this.fillNthSpinbutton(dialog, 1, 1);
  }

  async saveCancellationExpecting(method: 'POST' | 'PUT', status: number | number[]) {
    const allowed = Array.isArray(status) ? status : [status];
    const write = this.page.waitForResponse(
      (response) =>
        this.isCancelWrite(response, method) &&
        !response.url().includes('assign-customers') &&
        !response.url().includes('duplicate') &&
        allowed.includes(response.status()),
      { timeout: 30000 }
    );
    await this.cancellationFormDialog.getByTestId('policies-cancellation-save').click();
    await write;
    await expect(this.cancellationFormDialog).toBeHidden({ timeout: 15000 });
  }

  async savePaymentExpecting(method: 'POST' | 'PUT', status: number | number[]) {
    const allowed = Array.isArray(status) ? status : [status];
    const write = this.page.waitForResponse(
      (response) => this.isPaymentWrite(response, method) && allowed.includes(response.status()),
      { timeout: 30000 }
    );
    await this.paymentFormDialog.getByTestId('policies-payment-save').click();
    await write;
    await expect(this.paymentFormDialog).toBeHidden({ timeout: 15000 });
  }

  async trySavePaymentBlocked() {
    await this.paymentFormDialog.getByTestId('policies-payment-save').click();
    await expect(this.paymentFormDialog).toBeVisible();
  }

  /** Client-side total % gate shows a toast (not an inline field error). */
  async expectPaymentTotalPercentBlocked() {
    await this.trySavePaymentBlocked();
    await this.expectToast(/Total percentage cannot exceed 100%/i);
  }

  async trySaveCancellationBlocked() {
    await this.cancellationFormDialog.getByTestId('policies-cancellation-save').click();
    await expect(this.cancellationFormDialog).toBeVisible();
  }

  async expectCancellationNameRequired() {
    await this.trySaveCancellationBlocked();
    await expect(
      this.cancellationFormDialog.getByText(/Please enter a policy name/i).first()
    ).toBeVisible();
  }

  async expectPaymentNameRequired() {
    await this.trySavePaymentBlocked();
    await expect(
      this.paymentFormDialog.getByText(/Please enter a policy name/i).first()
    ).toBeVisible();
  }

  /** Leave default 0% request — total must be > 0. */
  async expectPaymentTotalMinBlocked(name: string) {
    const dialog = this.paymentFormDialog;
    await dialog.getByLabel(/^Policy name/).fill(name);
    await this.trySavePaymentBlocked();
    await this.expectToast(/Total percentage must be greater than 0/i);
  }

  /** First request-row trigger Select (percentage is spinbutton; trigger is combobox). */
  async selectPaymentTrigger(optionName: string | RegExp) {
    const dialog = this.paymentFormDialog;
    const triggerCombo = dialog.getByRole('combobox').first();
    await expect(triggerCombo).toBeVisible();
    await triggerCombo.click();
    const option = this.page.getByRole('option', { name: optionName }).first();
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
  }

  paymentDaysOffsetSpinbutton(): Locator {
    // After choosing a days-* trigger, days-offset becomes the only newly-enabled spinbutton
    // besides percentage — prefer the enabled spinbutton that is not the first (percentage).
    return this.paymentFormDialog.getByRole('spinbutton', { disabled: false }).nth(1);
  }

  async expectPaymentDaysOffsetEnabled() {
    const days = this.paymentDaysOffsetSpinbutton();
    await expect(days).toBeVisible();
    await expect(days).toBeEnabled();
  }

  async expectPaymentDaysOffsetRequiredBlocked(name: string) {
    const dialog = this.paymentFormDialog;
    await dialog.getByLabel(/^Policy name/).fill(name);
    await this.fillNthSpinbutton(dialog, 0, 100);
    await this.selectPaymentTrigger(/Days after confirmation/i);
    await this.expectPaymentDaysOffsetEnabled();
    await this.trySavePaymentBlocked();
    await this.expectToast(/Days offset is required for this trigger/i);
  }

  async expectToast(message: string | RegExp) {
    await expect(this.page.getByText(message).first()).toBeVisible({ timeout: 15000 });
  }

  async openEditCancellationByName(name: string) {
    const row = this.cancellationRowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.cancellationFormDialog).toBeVisible();
  }

  async openEditPaymentByName(name: string) {
    const row = this.paymentRowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.paymentFormDialog).toBeVisible();
  }

  cancellationDeleteButton(policyId: number): Locator {
    return this.page.getByTestId(`policies-cancellation-delete-${policyId}`);
  }

  paymentDeleteButton(policyId: number): Locator {
    return this.page.getByTestId(`policies-payment-delete-${policyId}`);
  }

  async expectCancellationDeleteDisabled(policyId: number) {
    const btn = this.cancellationDeleteButton(policyId);
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  }

  async deleteCancellationByName(name: string) {
    const row = this.cancellationRowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /^Delete/ }).click();
    await expect(this.deleteDialog).toBeVisible();
    const del = this.page.waitForResponse(
      (response) => this.isCancelWrite(response, 'DELETE') && response.ok(),
      { timeout: 30000 }
    );
    await this.deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await del;
  }

  async deletePaymentByName(name: string) {
    const row = this.paymentRowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /^Delete/ }).click();
    await expect(this.deleteDialog).toBeVisible();
    const del = this.page.waitForResponse(
      (response) => this.isPaymentWrite(response, 'DELETE') && response.ok(),
      { timeout: 30000 }
    );
    await this.deleteDialog.getByRole('button', { name: 'Delete' }).click();
    await del;
  }

  async openRowMenuByName(name: string) {
    const row = this.cancellationRowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /Actions for/ }).click();
  }

  async chooseMenuItem(label: string | RegExp) {
    // Popup Menu teleports — bind to page-level menuitem, not the hidden Menu root.
    const item = this.page.getByRole('menuitem', { name: label });
    await expect(item).toBeVisible({ timeout: 10000 });
    await item.click();
  }

  async duplicateCancellationByName(name: string) {
    const write = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/duplicate/') &&
        response.ok(),
      { timeout: 30000 }
    );
    await this.openRowMenuByName(name);
    await this.chooseMenuItem(/Duplicate/);
    await write;
  }

  async openAssignByName(name: string) {
    await this.openRowMenuByName(name);
    await this.chooseMenuItem(/Assign to customers/);
    await expect(this.assignDialog).toBeVisible();
  }

  async assignFirstCustomerFromOptions() {
    const search = this.assignDialog.getByTestId('policies-cancellation-assign-search');
    await search.click();
    const option = this.page.getByRole('option').first();
    await expect(option).toBeVisible({ timeout: 20000 });
    await option.click();
    await this.assignDialog.getByTestId('policies-cancellation-assign-add').click();
    await expect(this.assignDialog.getByRole('listitem').first()).toBeVisible({ timeout: 15000 });
    const save = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('assign-customers') &&
        response.ok(),
      { timeout: 30000 }
    );
    await this.assignDialog.getByTestId('policies-cancellation-assign-save').click();
    await save;
  }

  async openPickDefault() {
    await this.applyDefaultButton.click();
    await expect(this.pickDefaultDialog).toBeVisible();
  }

  async pickDefaultPolicyByName(name: string) {
    await this.openComboboxAndChoose(this.pickDefaultDialog, name);
    const write = this.page.waitForResponse(
      (response) => this.isCancelWrite(response, 'PUT') && response.ok(),
      { timeout: 30000 }
    );
    await this.pickDefaultDialog.getByTestId('policies-cancellation-pick-default-apply').click();
    await write;
  }

  async expandPaymentRowByName(name: string) {
    const row = this.paymentRowByName(name).first();
    await expect(row).toBeVisible();
    const expander = row.getByRole('button').first();
    await expander.click();
  }

  async expectPaymentExpansionShowsPercent(percentLabel: string | RegExp) {
    await expect(this.page.getByText(percentLabel).first()).toBeVisible();
  }

  sectionPill(name: 'Cancellation' | 'Payment'): Locator {
    return this.page.getByRole('button', { name, exact: true }).or(
      this.page.getByRole('link', { name, exact: true })
    );
  }
}
