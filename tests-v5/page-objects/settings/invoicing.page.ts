import { expect, Locator, Page } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/**
 * Settings → Invoicing (`/settings/invoicing`).
 * Single GET/POST form with a sticky Save / Discard bar.
 */
export class InvoicingSettingsPage {
  readonly page: Page;
  readonly invoicingUrl: string;
  readonly profileUrl: string;

  readonly pageHeading: Locator;
  readonly generalSection: Locator;
  readonly invoicingMenuLink: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly paymentInfoInput: Locator;
  readonly latePaymentInterestInput: Locator;
  readonly itemPriceRounding: Locator;
  readonly invoiceTotalRounding: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly removeAttachmentButton: Locator;
  readonly fileInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.invoicingUrl = routes.settings.invoicing();
    this.profileUrl = routes.settings.profile();

    this.pageHeading = page.getByRole('heading', { name: 'Invoicing', level: 2 });
    this.generalSection = page.getByText('General', { exact: true }).first();
    this.invoicingMenuLink = page.getByRole('link', { name: 'Invoicing' });
    this.saveButton = page.getByRole('button', { name: /Save/ });
    this.discardButton = page.getByRole('button', { name: /Discard/ });
    this.paymentInfoInput = page.getByRole('textbox', { name: 'Payment info' });
    this.latePaymentInterestInput = page.getByRole('textbox', { name: 'Late payment interest' });
    this.itemPriceRounding = page.getByRole('combobox', { name: 'Item price rounding' });
    this.invoiceTotalRounding = page.getByRole('combobox', { name: 'Invoice total rounding method' });
    this.successToast = page.getByText('Invoicing settings saved', { exact: true });
    this.errorToast = page.getByText('File must be jpg, pdf, or svg', { exact: true });
    this.removeAttachmentButton = page.getByRole('button', { name: 'Remove attachment' });
    // Hidden native input has no accessible name (label `for` does not match). Same pattern as other upload POMs.
    this.fileInput = page.locator('input[type="file"]');
  }

  async goto() {
    const getDone = this.page.waitForResponse(
      (res) =>
        res.url().includes('/settings/invoice-settings/') &&
        res.request().method() === 'GET' &&
        res.ok(),
      { timeout: 30000 }
    );
    await this.page.goto(this.invoicingUrl);
    await getDone.catch(() => null);
    await this.waitForPageReady();
  }

  async gotoProfile() {
    await this.page.goto(this.profileUrl);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForPageReady() {
    await expect(this.pageHeading).toBeVisible({ timeout: 30000 });
    await expect(this.saveButton).toBeVisible({ timeout: 30000 });
    await expect(this.paymentInfoInput).toBeVisible({ timeout: 30000 });
  }

  /**
   * On/Off pair for a labelled FormSelectButton.
   * Scope from the field label's parent (FormFieldShell) so other On/Off pairs are ignored.
   */
  onOffButton(fieldLabel: string, on: boolean): Locator {
    const label = on ? 'On' : 'Off';
    return this.page
      .getByText(fieldLabel, { exact: true })
      .locator('..')
      .getByRole('button', { name: label, exact: true });
  }

  async clickInvoicingMenu() {
    const getDone = this.page.waitForResponse(
      (res) =>
        res.url().includes('/settings/invoice-settings/') &&
        res.request().method() === 'GET' &&
        res.ok(),
      { timeout: 30000 }
    );
    await this.invoicingMenuLink.click();
    await getDone.catch(() => null);
    await this.waitForPageReady();
  }

  async setOnOff(fieldLabel: string, on: boolean) {
    const button = this.onOffButton(fieldLabel, on);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  async isOnOffPressed(fieldLabel: string, on: boolean): Promise<boolean> {
    return (await this.onOffButton(fieldLabel, on).getAttribute('aria-pressed')) === 'true';
  }

  async fillPaymentInfo(value: string) {
    await this.paymentInfoInput.fill(value);
  }

  async fillLatePaymentInterest(value: string) {
    await this.latePaymentInterestInput.fill(value);
  }

  async selectItemPriceRounding(optionLabel: string) {
    await this.itemPriceRounding.click();
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
  }

  async selectInvoiceTotalRounding(optionLabel: string) {
    await this.invoiceTotalRounding.click();
    await this.page.getByRole('option', { name: optionLabel, exact: true }).click();
  }

  async clickSave() {
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    const postDone = this.page.waitForResponse(
      (res) =>
        res.url().includes('/settings/invoice-settings/') &&
        res.request().method() === 'POST' &&
        res.ok(),
      { timeout: 20000 }
    );
    await this.saveButton.click();
    await postDone;
  }

  async clickDiscard() {
    await expect(this.discardButton).toBeEnabled({ timeout: 5000 });
    const getDone = this.page.waitForResponse(
      (res) =>
        res.url().includes('/settings/invoice-settings/') && res.request().method() === 'GET',
      { timeout: 15000 }
    );
    await this.discardButton.click();
    await getDone.catch(() => null);
    await expect(this.saveButton).toBeDisabled({ timeout: 10000 });
  }

  async waitForSavedToast() {
    await expect(this.successToast).toBeVisible({ timeout: 10000 });
  }

  async waitForInvalidFileToast() {
    await expect(this.errorToast).toBeVisible({ timeout: 10000 });
  }

  async attachPdfNamed(fileName: string) {
    await this.fileInput.setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
    });
  }

  async attachUnsupportedFile() {
    await this.fileInput.setInputFiles({
      name: 'AT_invoice.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });
  }

  async hasExistingAttachment(): Promise<boolean> {
    return (await this.removeAttachmentButton.count()) > 0;
  }

  async removeAttachment() {
    await this.removeAttachmentButton.click();
  }
}
