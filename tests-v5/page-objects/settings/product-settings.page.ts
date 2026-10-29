import { Page, Locator, expect } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/**
 * V5 Settings → Product (Tolls & VAT).
 * Cases: TC-SETTINGS-PRODUCT-*
 */
export class ProductSettingsPage {
  readonly page: Page;
  readonly pageUrl: string;

  readonly pageTitle: Locator;
  readonly tollsVatSection: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = routes.settings.product();
    this.pageTitle = page.getByRole('heading', { name: /Product/i });
    this.tollsVatSection = page.getByText('Tolls & VAT');
    this.saveButton = page.getByRole('button', { name: /Save/i });
    this.discardButton = page.getByRole('button', { name: /Discard/i });
    this.successToast = page.getByText('Product settings saved');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.pageUrl);
    await expect(this.pageTitle).toBeVisible({ timeout: 30_000 });
  }

  async waitForLoaded(): Promise<void> {
    await expect(this.tollsVatSection).toBeVisible({ timeout: 30_000 });
    // Wait until at least one Yes/No control is present
    await expect(this.page.getByRole('button', { name: 'Yes' }).first()).toBeVisible({
      timeout: 30_000,
    });
  }

  vatOrgYes(): Locator {
    // FormFieldShell ties label `for` to the field name
    return this.page.getByLabel('Apply default VAT to organizational customers').getByRole('button', {
      name: 'Yes',
    });
  }

  vatOrgNo(): Locator {
    return this.page.getByLabel('Apply default VAT to organizational customers').getByRole('button', {
      name: 'No',
    });
  }

  async setVatOrg(value: boolean): Promise<void> {
    await (value ? this.vatOrgYes() : this.vatOrgNo()).click();
  }

  async clickSave(): Promise<void> {
    await this.saveButton.click();
  }

  async clickDiscard(): Promise<void> {
    await this.discardButton.click();
  }
}
