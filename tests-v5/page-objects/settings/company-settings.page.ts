import { Page, Locator, expect } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/**
 * Page Object for the V5 Company Settings page.
 *
 * This page object is built for the `/v5/settings/profile` route and excludes the
 * Business Profiles section, focusing on the company settings sections only.
 */
export class CompanySettingsPage {
  readonly page: Page;

  // Route used by all company settings smoke tests.
  readonly settingsProfileUrl = routes.settings.profile();

  // Global action buttons shown in the floating action bar.
  readonly saveButton: Locator;
  readonly discardButton: Locator;


  // Top Navigation buttons for each settings section, used to confirm navigation.
  readonly basicInfoNavButton: Locator;
  readonly notifyByRoleNavButton: Locator;
  readonly smsNavButton: Locator;
  readonly backupEmailNavButton: Locator;
  readonly awsSesNavButton: Locator;
  

  // Section headers used to confirm page load and section visibility.
  readonly basicInfoSection: Locator;
  readonly notifyByRoleSection: Locator;
  readonly smsSection: Locator;
  readonly backupEmailSection: Locator;
  readonly awsSesSection: Locator;

  // Basic Info inputs.
  readonly termsUrlInput: Locator;
  readonly currencyDropdown: Locator;
  readonly countryPrefixInput: Locator;
  readonly enterpriseDomainInput: Locator;

  // Notify by Role inputs.
  readonly salesOfficerEmailInput: Locator;
  readonly planningOfficerEmailInput: Locator;
  readonly ticketingEmailInput: Locator;
  readonly invoiceSenderEmailInput: Locator;
  readonly hrEmailInput: Locator;

  // SMS section input.
  readonly companySmsSourceInput: Locator;

  // Backup email section inputs.
  readonly backupEmailInput: Locator;
  readonly backupSendingTimeInput: Locator;
  readonly backupFrequencyDaysInput: Locator;

  // AWS SES section elements.
  readonly awsSesTestConnectionButton: Locator;

  // Toast messages for success and error feedback.
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.discardButton = page.getByRole('button', { name: 'Discard' });

    // Top navigation buttons
    this.basicInfoNavButton = page.getByText('Basic info').first();
    this.notifyByRoleNavButton = page.getByText('Notify by role').first();
    this.smsNavButton = page.getByText('SMS').first();
    this.backupEmailNavButton = page.getByText('Backup email settings').first();
    this.awsSesNavButton = page.getByText('AWS SES Outgoing email settings').first();

    // Section headers
    this.basicInfoSection = page.locator('#basic-info');
    this.notifyByRoleSection = page.locator('#notify-by-role');
    this.smsSection = page.locator('#sms');
    this.backupEmailSection = page.locator('#backup-email-settings');
    this.awsSesSection = page.locator('#aws-ses-outgoing-email-settings');

    // Basic Info input fields
    this.termsUrlInput = page.locator('input[id="termsUrl"]');
    this.currencyDropdown = page.locator('#currencyId');
    this.countryPrefixInput = page.locator('input[id="countryPrefix"]');
    this.enterpriseDomainInput = page.locator('input[id="enterpriseDomain"]');

    // Notify by Role input fields
    this.salesOfficerEmailInput = page.locator('input[id="salesOfficerEmail"]');
    this.planningOfficerEmailInput = page.locator('input[id="planningOfficerEmail"]');
    this.ticketingEmailInput = page.locator('input[id="ticketingEmail"]');
    this.invoiceSenderEmailInput = page.locator('input[id="invoiceSenderEmail"]');
    this.hrEmailInput = page.locator('input[id="hrEmail"]');

    // SMS input fields
    this.companySmsSourceInput = page.locator('input[id="companySmsSource"]');

    // Backup email input fields
    this.backupEmailInput = page.locator('input[id="backupEmail"]');
    this.backupSendingTimeInput = page.locator('input[id="backupSendingTime"]');
    this.backupFrequencyDaysInput = page.locator('input[id="backupFrequencyDays"]');

    // AWS SES connection test button
    this.awsSesTestConnectionButton = page.getByRole('button', { name: 'Test connection' });

    // Toast messages
    this.successToast = page.locator('.p-toast-message-success');
    this.errorToast = page.locator('.p-toast-message-error');
  }

  /**
   * Navigate to the V5 Company Settings profile page and wait for the page to stabilize.
   */
  async goto() {
    await this.page.goto(this.settingsProfileUrl);
    await this.page.waitForLoadState('networkidle');
    await this.waitForPageReady();
  }

  /**
   * Wait until all company settings sections are visible.
   */
  async waitForPageReady() {
    await Promise.all([
      this.basicInfoSection.waitFor({ state: 'visible' }),
      this.notifyByRoleSection.waitFor({ state: 'visible' }),
      this.smsSection.waitFor({ state: 'visible' }),
      this.backupEmailSection.waitFor({ state: 'visible' }),
      this.awsSesSection.waitFor({ state: 'visible' }),
      this.saveButton.waitFor({ state: 'visible' }),
    ]);
  }

    // Section navigation helpers
    async goToBasicInfoSection() {
        await this.basicInfoNavButton.click();
        await this.basicInfoSection.scrollIntoViewIfNeeded();
    }

    async goToNotifyByRoleSection() {
        await this.notifyByRoleNavButton.click();
        await this.notifyByRoleSection.scrollIntoViewIfNeeded();
    }

    async goToSmsSection() {
        await this.smsNavButton.click();
        await this.smsSection.scrollIntoViewIfNeeded();
    }

    async goToBackupEmailSection() {
        await this.backupEmailNavButton.click();
        await this.backupEmailSection.scrollIntoViewIfNeeded();
    }

    async goToAwsSesSection() {
        await this.awsSesNavButton.click();
        await this.awsSesSection.scrollIntoViewIfNeeded();
    }

    async selectCurrency(currencyLabel: string) {
      const currencyCombobox = this.basicInfoSection.getByRole('combobox').first();
      await currencyCombobox.click();
      const listbox = this.page.locator('.p-select-overlay, .p-popover, [role="listbox"]').last();
      await listbox.waitFor({ state: 'visible', timeout: 10000 });
      await listbox.getByRole('option', { name: new RegExp(currencyLabel, 'i') }).first().click();
    }

  /**
   * Fill the Basic Info section with the provided values.
   */
  async fillBasicInfo(data: {
    termsUrl?: string;
    currencyId?: string;
    countryPrefix?: string;
    enterpriseDomain?: string;
  }) {
    // Ensure navigation to Basic Info section before interacting with inputs.
    await this.goToBasicInfoSection();

    // Fill input fields only if corresponding data properties are provided.
    if (data.termsUrl !== undefined) {
      await this.termsUrlInput.fill(data.termsUrl);
      await this.termsUrlInput.blur();
    }
    if (data.currencyId !== undefined) {
      await this.selectCurrency(data.currencyId);
    }
    if (data.countryPrefix !== undefined) {
      await this.countryPrefixInput.fill(data.countryPrefix);
      await this.countryPrefixInput.blur();
    }
    if (data.enterpriseDomain !== undefined) {
      await this.enterpriseDomainInput.fill(data.enterpriseDomain);
      await this.enterpriseDomainInput.blur();
    }
  }

  /**
   * Fill the Notify by Role section with the provided values.
   */
  async fillNotifyByRole(data: {
    salesOfficerEmail?: string;
    planningOfficerEmail?: string;
    ticketingEmail?: string;
    invoiceSenderEmail?: string;
    hrEmail?: string;
  }) {
    // Ensure navigation to Notify by Role section before interacting with inputs.
    await this.goToNotifyByRoleSection();

    // Fill input fields only if corresponding data properties are provided.
    if (data.salesOfficerEmail !== undefined) {
      await this.salesOfficerEmailInput.fill(data.salesOfficerEmail);
      await this.salesOfficerEmailInput.blur();
    }
    if (data.planningOfficerEmail !== undefined) {
      await this.planningOfficerEmailInput.fill(data.planningOfficerEmail);
      await this.planningOfficerEmailInput.blur();
    }
    if (data.ticketingEmail !== undefined) {
      await this.ticketingEmailInput.fill(data.ticketingEmail);
      await this.ticketingEmailInput.blur();
    }
    if (data.invoiceSenderEmail !== undefined) {
      await this.invoiceSenderEmailInput.fill(data.invoiceSenderEmail);
      await this.invoiceSenderEmailInput.blur();
    }
    if (data.hrEmail !== undefined) {
      await this.hrEmailInput.fill(data.hrEmail);
      await this.hrEmailInput.blur();
    }
  }

  /**
   * Fill the SMS section with the supplied source value.
   */
  async fillSmsSource(source: string) {
    // Ensure navigation to SMS section before interacting with inputs.
    await this.goToSmsSection();

    // Fill input field with the provided source value.
    await this.companySmsSourceInput.fill(source);
    await this.companySmsSourceInput.blur();
  }

  /**
   * Fill the Backup Email section with the provided values.
   */
  async fillBackupEmail(data: {
    backupEmail?: string;
    backupSendingTime?: string;
    backupFrequencyDays?: string;
  }) {
    // Ensure navigation to Backup Email section before interacting with inputs.
    await this.goToBackupEmailSection();
    // Fill input fields only if corresponding data properties are provided.
    if (data.backupEmail !== undefined) {
      await this.backupEmailInput.fill(data.backupEmail);
      await this.backupEmailInput.blur();
    }
    if (data.backupSendingTime !== undefined) {
      await this.backupSendingTimeInput.fill(data.backupSendingTime);
      await this.backupSendingTimeInput.blur();
    }
    if (data.backupFrequencyDays !== undefined) {
      await this.backupFrequencyDaysInput.fill(data.backupFrequencyDays);
      await this.backupFrequencyDaysInput.blur();
    }
  }

  /** Wait until the floating Save action is enabled (form has unsaved changes). */
  async waitForSaveEnabled() {
    await expect(this.saveButton).toBeEnabled({ timeout: 10000 });
  }

  /** Wait until the floating Discard action is enabled. */
  async waitForDiscardEnabled() {
    await expect(this.discardButton).toBeEnabled({ timeout: 10000 });
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private isValidUrl(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureValidEmailField(input: Locator, fallback: string) {
    const current = await input.inputValue();
    if (this.isValidEmail(current)) {
      return;
    }
    await input.fill(fallback);
    await input.blur();
  }

  private async ensureValidUrlField(input: Locator, fallback: string) {
    const current = await input.inputValue();
    if (this.isValidUrl(current)) {
      return;
    }
    await input.fill(fallback);
    await input.blur();
  }

  private async ensureValidBackupTimeField() {
    const current = (await this.backupSendingTimeInput.inputValue()).trim();
    if (!current) {
      return;
    }

    const match = current.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      await this.backupSendingTimeInput.fill('08:00');
      await this.backupSendingTimeInput.blur();
      return;
    }

    const [, hours, minutes] = match;
    const normalized = `${hours.padStart(2, '0')}:${minutes}`;
    if (normalized !== current) {
      await this.backupSendingTimeInput.fill(normalized);
      await this.backupSendingTimeInput.blur();
    }
  }

  private async ensureValidSmsSourceField() {
    const current = (await this.companySmsSourceInput.inputValue()).trim();
    if (current.length >= 2 && current.length <= 11 && /^[a-zA-Z0-9 ]+$/.test(current)) {
      return;
    }
    await this.companySmsSourceInput.fill('TEQSMS');
    await this.companySmsSourceInput.blur();
  }

  /**
   * Save validates every section — ensure cross-section email/url fields won't block the POST.
   * Only patches invalid or empty values; leaves valid loaded data untouched.
   */
  async prepareAllSectionsForSave() {
    await this.goToBasicInfoSection();
    await this.ensureValidUrlField(this.termsUrlInput, 'https://example.com/terms');
    await this.ensureValidUrlField(this.enterpriseDomainInput, 'https://example.com');

    await this.goToNotifyByRoleSection();
    await this.ensureValidEmailField(this.salesOfficerEmailInput, 'sales@example.com');
    await this.ensureValidEmailField(this.planningOfficerEmailInput, 'planning@example.com');
    await this.ensureValidEmailField(this.ticketingEmailInput, 'ticketing@example.com');
    await this.ensureValidEmailField(this.invoiceSenderEmailInput, 'billing@example.com');
    await this.ensureValidEmailField(this.hrEmailInput, 'hr@example.com');

    await this.goToSmsSection();
    await this.ensureValidSmsSourceField();

    await this.goToBackupEmailSection();
    await this.ensureValidEmailField(this.backupEmailInput, 'backup@example.com');
    await this.ensureValidBackupTimeField();
  }

  /**
   * Click the global Save button in the floating action bar.
   * @param options.prepare — when true (default), patches invalid cross-section fields before save (smoke/e2e happy path).
   *   Set false for regression validation tests that intentionally leave invalid values in place.
   * @param options.awaitResponse — when true, waits for the company-settings POST (default: same as `prepare`).
   *   Set false when client-side validation blocks the request; set true with `prepare: false` when testing backend rejection.
   * @param options.requireEnabled — when false, clicks Save even if the button is disabled (invalid form state).
   */
  async clickSave(options: {
    prepare?: boolean;
    awaitResponse?: boolean;
    requireEnabled?: boolean;
  } = {}) {
    const { prepare = true, awaitResponse = prepare, requireEnabled = true } = options;
    if (prepare) {
      await this.prepareAllSectionsForSave();
    }
    if (requireEnabled) {
      await this.waitForSaveEnabled();
    }
    if (awaitResponse) {
      const saveResponse = this.page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/settings/company-settings'),
        { timeout: 30000 }
      );
      await this.saveButton.click();
      this.lastSaveResponse = await saveResponse;
    } else {
      await this.saveButton.click({ force: !requireEnabled });
      this.lastSaveResponse = null;
    }
  }

  private lastSaveResponse: Awaited<ReturnType<Page['waitForResponse']>> | null = null;

  /**
   * Click the global Discard button in the floating action bar.
   * Reloads afterward because discard only refetches — vee-validate does not reset inputs in-place.
   */
  async clickDiscard() {
    await this.waitForDiscardEnabled();
    const refetchPromise = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/settings/company-settings') &&
        response.ok(),
      { timeout: 30000 }
    );
    await this.discardButton.click();
    await refetchPromise.catch(() => {});
    await this.page.reload();
    await this.waitForPageReady();
  }

  /**
   * Wait for save to complete — success toast, or throw with error toast / validation hint.
   */
  async waitForSaveResult(successMessage = 'Company settings saved') {
    if (this.lastSaveResponse && !this.lastSaveResponse.ok()) {
      const body = await this.lastSaveResponse.text().catch(() => '');
      throw new Error(
        `Company settings save failed (${this.lastSaveResponse.status()}): ${body || 'unknown error'}`
      );
    }

    const successToast = this.page
      .locator('.p-toast-message-success')
      .or(this.page.getByRole('alert').filter({ hasText: successMessage }))
      .filter({ hasText: successMessage });
    const errorToast = this.page
      .locator('.p-toast-message-error')
      .or(
        this.page.getByRole('alert').filter({
          hasText: /company_settings_update_error|50062|save failed/i,
        })
      );

    const outcome = await Promise.race([
      successToast
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'success' as const),
      errorToast
        .first()
        .waitFor({ state: 'visible', timeout: 30000 })
        .then(() => 'error' as const),
    ]).catch(() => 'none' as const);

    if (outcome === 'success') {
      this.lastSaveResponse = null;
      return;
    }

    if (outcome === 'error') {
      const message = (await errorToast.first().textContent())?.trim() ?? 'unknown error';
      this.lastSaveResponse = null;
      throw new Error(`Company settings save failed: ${message}`);
    }

    const validationErrors = await this.getValidationErrors();
    if (validationErrors.length > 0) {
      throw new Error(`Company settings save blocked by validation: ${validationErrors.join('; ')}`);
    }

    throw new Error(
      'Company settings save did not complete — no success toast (client validation may have blocked the request)'
    );
  }

  /**
   * Wait for a success toast to appear, optionally matching a specific message fragment.
   */
  async waitForSuccessToast(messageFragment?: string) {
    const toast = messageFragment
      ? this.page.locator('.p-toast-message-success').filter({ hasText: messageFragment })
      : this.successToast;
    await toast.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Wait for an error toast to appear, optionally matching a specific message fragment.
   */
  async waitForErrorToast(messageFragment?: string) {
    const toast = messageFragment
      ? this.page.locator('.p-toast-message-error').filter({ hasText: messageFragment })
      : this.errorToast;
    await toast.first().waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Return whether the AWS SES Test connection button is currently disabled.
   */
  async isAwsSesTestConnectionDisabled(): Promise<boolean> {
    return this.awsSesTestConnectionButton.isDisabled();
  }

  // --- Collapsible Panel Support ---

  /**
   * Expand a collapsed section by clicking its panel toggler.
   * @param sectionId - The section ID (e.g., 'basic-info', 'notify-by-role', 'sms', 'backup-email-settings', 'aws-ses-outgoing-email-settings')
   */
  // --- Collapsible Panel Support ---

  async expandSection(sectionId: string) {
    const section = this.page.locator(`#${sectionId}`);

    const toggler = section.locator('.p-panel-toggle-button');

    if (await toggler.count() > 0) {
      const isExpanded = await toggler.getAttribute('aria-expanded');

      if (isExpanded === 'false') {
        await toggler.click();

        await expect(toggler)
          .toHaveAttribute('aria-expanded', 'true');
      }
    }
  }

  async collapseSection(sectionId: string) {
    const section = this.page.locator(`#${sectionId}`);

    const toggler = section.locator('.p-panel-toggle-button');

    if (await toggler.count() > 0) {
      const isExpanded = await toggler.getAttribute('aria-expanded');

      if (isExpanded === 'true') {
        await toggler.click();

        await expect(toggler)
          .toHaveAttribute('aria-expanded', 'false');
      }
    }
  }


  async isSectionExpanded(sectionId: string): Promise<boolean> {
    const section = this.page.locator(`#${sectionId}`);

    const toggler = section.locator('.p-panel-toggle-button');

    return (
      await toggler.getAttribute('aria-expanded')
    ) === 'true';
  }

  /**
   * Get validation errors for a specific section or all sections.
   * @param sectionId - Optional section ID to filter errors by section
   * @returns Promise<string[]> - Array of validation error messages
   */
  async getValidationErrors(sectionId?: string): Promise<string[]> {
    const scope = sectionId
      ? this.page.locator(`#${sectionId}`)
      : this.page;

    const errorLocator = scope.locator('small.text-red-500');

    const errors: string[] = [];
    const count = await errorLocator.count();

    for (let i = 0; i < count; i++) {
      const text = await errorLocator.nth(i).textContent();
      const trimmed = text?.trim() ?? '';
      if (trimmed && trimmed !== '*') {
        errors.push(trimmed);
      }
    }

    return errors;
  }

  /**
   * Wait for a specific section to load its data.
   * @param sectionId - The section ID to wait for
   */
  async waitForSectionLoad(sectionId: string) {
    const section = this.page.locator(`#${sectionId}`);
    await section.waitFor({ state: 'visible' });
    
    // Wait for loading state to complete (no loading indicators)
    await section.locator('.p-datatable-loading-overlay').waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {}); // Ignore if no loading overlay exists
  }

  /**
   * Clear all input fields in all sections (useful for negative testing).
   */
  async clearAllFields() {
    // Clear Basic Info fields
    await this.termsUrlInput.clear();
    await this.countryPrefixInput.clear();
    await this.enterpriseDomainInput.clear();
    
    // Clear Notify by Role fields
    await this.salesOfficerEmailInput.clear();
    await this.planningOfficerEmailInput.clear();
    await this.ticketingEmailInput.clear();
    await this.invoiceSenderEmailInput.clear();
    await this.hrEmailInput.clear();
    
    // Clear SMS field
    await this.companySmsSourceInput.clear();
    
    // Clear Backup Email fields
    await this.backupEmailInput.clear();
    await this.backupSendingTimeInput.clear();
    await this.backupFrequencyDaysInput.clear();
  }

  /**
   * Expand a section and ensure it's ready for interaction.
   * @param sectionId - The section ID to expand and prepare
   */
  async expandAndPrepareSection(sectionId: string) {
    await this.expandSection(sectionId);
    await this.waitForSectionLoad(sectionId);
    // Scroll section into view for better interaction
    await this.page.locator(`#${sectionId}`).scrollIntoViewIfNeeded();
  }

  /**
   * Navigate to a specific section using navigation pills.
   * @param sectionId - The section ID to navigate to
   */
  async goToSection(sectionId: string) {
    switch (sectionId) {
      case 'basic-info':
        await this.goToBasicInfoSection();
        break;
      case 'notify-by-role':
        await this.goToNotifyByRoleSection();
        break;
      case 'sms':
        await this.goToSmsSection();
        break;
      case 'backup-email-settings':
        await this.goToBackupEmailSection();
        break;
      case 'aws-ses-outgoing-email-settings':
        await this.goToAwsSesSection();
        break;
      default:
        throw new Error(`Unknown section ID: ${sectionId}`);
    }
  }
}
