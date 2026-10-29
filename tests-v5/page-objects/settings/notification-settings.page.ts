import { Locator, Page, expect } from '@playwright/test';
import { v5PageUrl } from '../../helpers/v5-routes';

export type AlertRowKey =
  | 'acceptedByCustomer'
  | 'quotationLost'
  | 'absenceRequest'
  | 'newQuotation'
  | 'busbusinessCancellation';

/**
 * Page Object for V5 Notification Settings (`/settings/notifications`).
 * Path has no `/v5` prefix — matches local FE `VITE_BASE_PATH=/` and sales page-object convention.
 */
export class NotificationSettingsPage {
  readonly page: Page;
  readonly settingsUrl = v5PageUrl('/settings/notifications');
  readonly settingsProfileUrl = v5PageUrl('/settings/profile');

  readonly saveButton: Locator;
  readonly discardButton: Locator;

  readonly alertSection: Locator;
  readonly customerSection: Locator;
  readonly notifyDriverSmsSection: Locator;

  readonly alertNavButton: Locator;
  readonly customerNavButton: Locator;
  readonly notifyDriverSmsNavButton: Locator;

  readonly notificationsMenuLink: Locator;

  readonly expirySmsToggle: Locator;
  readonly expirySmsDaysInput: Locator;
  readonly expiryEmailToggle: Locator;
  readonly expiryEmailDaysInput: Locator;
  readonly pocSmsToggle: Locator;
  /** UI field — hours before trip; API still receives days_before_trip + dispatch_time. */
  readonly pocSmsHoursInput: Locator;

  readonly frequencySelect: Locator;
  readonly sendTimeInput: Locator;

  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;

    this.saveButton = page.getByRole('button', { name: 'Save' });
    this.discardButton = page.getByRole('button', { name: 'Discard' });

    this.alertSection = page.locator('#internal');
    this.customerSection = page.locator('#customer');
    this.notifyDriverSmsSection = page.locator('#notify-driver-sms');

    this.alertNavButton = page.getByText('Internal', { exact: true }).first();
    this.customerNavButton = page.getByText('Customer', { exact: true }).first();
    this.notifyDriverSmsNavButton = page.getByText('Notify Driver SMS', { exact: true }).first();

    this.notificationsMenuLink = page.locator('nav a', { hasText: 'Notifications' });

    this.expirySmsToggle = page.locator('[data-field="notifyExpirySms.enabled"] .p-selectbutton');
    this.expirySmsDaysInput = page.locator('input[id="notifyExpirySms.daysBefore"]');
    this.expiryEmailToggle = page.locator('[data-field="notifyExpiryEmail.enabled"] .p-selectbutton');
    this.expiryEmailDaysInput = page.locator('input[id="notifyExpiryEmail.daysBefore"]');
    this.pocSmsToggle = page.locator('[data-field="pocSms.enabled"] .p-selectbutton');
    this.pocSmsHoursInput = page.locator('input[id="pocSms.hoursBeforeTrip"]');

    this.frequencySelect = page.locator('#notify-driver-sms .p-selectbutton, #notify-driver-sms [class*="p-selectbutton"]').first();
    this.sendTimeInput = page.locator('input[id="sendTime"]');

    this.successToast = page.locator('.p-toast-message-success');
    this.errorToast = page.locator('.p-toast-message-error');
  }

  alertRowToggle(row: AlertRowKey): Locator {
    return this.page.locator(`[data-field="${row}.enabled"] .p-selectbutton`);
  }

  alertRowPhone(row: AlertRowKey): Locator {
    return this.page.locator(`input[id="${row}.phone"]`);
  }

  alertRowEmail(row: Exclude<AlertRowKey, 'busbusinessCancellation'>): Locator {
    return this.page.locator(`input[id="${row}.email"]`);
  }

  /** Set On/Off FormSelectButton (PrimeVue SelectButton) to the desired boolean. */
  async setOnOffSelect(select: Locator, enabled: boolean) {
    const label = enabled ? 'On' : 'Off';
    const option = select.locator('.p-togglebutton', { hasText: label });
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
  }

  /** Flip On/Off FormSelectButton regardless of current value. */
  async flipOnOffSelect(select: Locator) {
    const onOption = select.locator('.p-togglebutton', { hasText: 'On' });
    const isOn = (await onOption.getAttribute('aria-pressed')) === 'true';
    await this.setOnOffSelect(select, !isOn);
  }

  async goto() {
    const responsePromise = this.page.waitForResponse(
      (res) =>
        res.url().includes('/settings/notification-settings/') &&
        res.request().method() === 'GET',
      // Fresh-auth loads involve an Auth0 redirect chain before the page renders;
      // give the API call extra room to arrive.
      { timeout: 30000 }
    );
    await this.page.goto(this.settingsUrl);
    await responsePromise.catch(() => null);
    await this.page.waitForLoadState('networkidle');
    await this.waitForPageReady();
  }

  async waitForPageReady() {
    // Use an explicit 30 s per-locator timeout so fresh-auth loads (which are
    // slower due to the Auth0 redirect chain) don't trip the 15 s actionTimeout.
    const opts = { state: 'visible' as const, timeout: 30000 };
    await Promise.all([
      this.alertSection.waitFor(opts),
      this.customerSection.waitFor(opts),
      this.notifyDriverSmsSection.waitFor(opts),
      this.saveButton.waitFor(opts),
    ]);
    await this.page.waitForTimeout(400);
  }

  async goToAlertSection() {
    await this.alertNavButton.click();
    await this.alertSection.waitFor({ state: 'visible' });
    await this.alertSection.scrollIntoViewIfNeeded();
  }

  async goToCustomerSection() {
    await this.customerNavButton.click();
    await this.customerSection.waitFor({ state: 'visible' });
    await this.customerSection.scrollIntoViewIfNeeded();
  }

  async goToNotifyDriverSmsSection() {
    await this.notifyDriverSmsNavButton.click();
    // Wait for the section to be visible/stable after the nav click — Vue may
    // briefly detach and re-attach #notify-driver-sms during the scroll animation.
    await this.notifyDriverSmsSection.waitFor({ state: 'visible' });
    await this.notifyDriverSmsSection.scrollIntoViewIfNeeded();
  }

  async clickSave() {
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    await this.saveButton.click();
  }

  async clickDiscard() {
    // Wait until Discard is enabled (dirty + not busy)
    await expect(this.discardButton).toBeEnabled({ timeout: 5000 });
    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (res) =>
            res.url().includes('/settings/notification-settings/') &&
            res.request().method() === 'GET',
          { timeout: 10000 }
        )
        .catch(() => null),
      this.discardButton.click(),
    ]);
    await this.page.waitForTimeout(response ? 400 : 1000);
    await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

  async waitForSuccessToast(messageFragment?: string) {
    const toast = messageFragment
      ? this.page.locator('.p-toast-message-success').filter({ hasText: messageFragment })
      : this.successToast;
    try {
      await toast.waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      const errorText = (
        await this.errorToast.first().textContent().catch(() => null)
      )?.trim();
      if (errorText) {
        throw new Error(
          `Expected success toast${messageFragment ? ` containing "${messageFragment}"` : ''}, but error toast showed: ${errorText}`
        );
      }
      throw error;
    }
  }

  async waitForErrorToast(messageFragment?: string) {
    const toast = messageFragment
      ? this.page.locator('.p-toast-message-error').filter({ hasText: messageFragment }).first()
      : this.errorToast.first();
    await toast.waitFor({ state: 'visible', timeout: 10000 });
  }

  async pressEscape() {
    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (res) =>
            res.url().includes('/settings/notification-settings/') &&
            res.request().method() === 'GET',
          { timeout: 10000 }
        )
        .catch(() => null),
      this.page.keyboard.press('Escape'),
    ]);
    await this.page.waitForTimeout(response ? 400 : 1000);
    await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

  /**
   * Collect visible inline validation messages.
   * Section ids match SettingsPageLayout anchors: `internal` | `customer` | `notify-driver-sms`.
   * Legacy alias `alert` → `internal`.
   */
  async getValidationErrors(sectionId?: string): Promise<string[]> {
    const resolved =
      sectionId === 'alert' ? 'internal' : sectionId;
    const scope = resolved ? this.page.locator(`#${resolved}`) : this.page;
    // Prefer explicit error <small>; exclude required-asterisk spans.
    const errorLocator = scope.locator('small.text-red-500');
    const errors: string[] = [];
    const count = await errorLocator.count();
    for (let i = 0; i < count; i++) {
      const text = (await errorLocator.nth(i).textContent())?.trim();
      if (text) errors.push(text);
    }
    return errors;
  }

  /** Toggle PrimeVue ToggleSwitch OR On/Off SelectButton near the locator. */
  async setToggle(input: Locator, enabled: boolean) {
    // On/Off SelectButton path (notifications redesign)
    if ((await input.locator('.p-togglebutton').count()) > 0) {
      await this.setOnOffSelect(input, enabled);
      return;
    }
    const checked = await input.isChecked().catch(() => false);
    if (checked === enabled) return;
    const switchRoot = input.locator('xpath=ancestor::*[contains(@class,"p-toggleswitch")][1]');
    if ((await switchRoot.count()) > 0) {
      await switchRoot.click();
    } else {
      await input.click({ force: true });
    }
  }

  async toggleAlertRow(row: AlertRowKey, enabled?: boolean) {
    await this.goToAlertSection();
    const toggle = this.alertRowToggle(row);
    if (enabled === undefined) {
      await this.flipOnOffSelect(toggle);
      return;
    }
    await this.setOnOffSelect(toggle, enabled);
  }

  async fillAlertPhone(row: AlertRowKey, phone: string) {
    await this.goToAlertSection();
    const input = this.alertRowPhone(row);
    await input.click();
    await input.fill(phone);
    await input.blur();
  }

  async fillAlertEmail(row: Exclude<AlertRowKey, 'busbusinessCancellation'>, email: string) {
    await this.goToAlertSection();
    const input = this.alertRowEmail(row);
    await input.click();
    await input.fill(email);
    await input.blur();
  }

  async fillExpirySms(data: { enabled?: boolean; daysBefore?: string }) {
    await this.goToCustomerSection();
    if (data.enabled !== undefined) await this.setToggle(this.expirySmsToggle, data.enabled);
    if (data.daysBefore !== undefined) {
      await this.expirySmsDaysInput.click();
      await this.expirySmsDaysInput.fill(data.daysBefore);
      await this.expirySmsDaysInput.blur();
    }
  }

  async fillExpiryEmail(data: { enabled?: boolean; daysBefore?: string }) {
    await this.goToCustomerSection();
    if (data.enabled !== undefined) await this.setToggle(this.expiryEmailToggle, data.enabled);
    if (data.daysBefore !== undefined) {
      await this.expiryEmailDaysInput.click();
      await this.expiryEmailDaysInput.fill(data.daysBefore);
      await this.expiryEmailDaysInput.blur();
    }
  }

  async fillPocSms(data: {
    enabled?: boolean;
    /** Hours before trip (UI). Converted to days_before_trip + dispatch_time on save. */
    hoursBeforeTrip?: string;
  }) {
    await this.goToCustomerSection();
    if (data.enabled !== undefined) await this.setToggle(this.pocSmsToggle, data.enabled);
    if (data.hoursBeforeTrip !== undefined) {
      await this.pocSmsHoursInput.click();
      await this.pocSmsHoursInput.fill(data.hoursBeforeTrip);
      await this.pocSmsHoursInput.blur();
    }
  }

  async selectFrequency(frequency: 'per_trip' | 'once_per_day') {
    await this.goToNotifyDriverSmsSection();
    const label = frequency === 'per_trip' ? 'Per Trip' : 'Once Per Day';
    const option = this.notifyDriverSmsSection.locator('.p-togglebutton', { hasText: label });
    await option.click();
    // Wait until selection sticks (PrimeVue ToggleButton uses aria-pressed)
    await expect(option).toHaveAttribute('aria-pressed', 'true');
  }

  async fillSendTime(time: string) {
    await this.goToNotifyDriverSmsSection();
    await this.sendTimeInput.waitFor({ state: 'visible' });
    await this.sendTimeInput.fill(time);
  }

  /**
   * Force a value into an input that native type=time may reject (e.g. "25:00").
   * Temporarily switches type to text so vee-validate receives the raw string.
   */
  async forceTimeInputValue(input: Locator, value: string) {
    await input.evaluate((el, nextValue) => {
      const inputEl = el as HTMLInputElement;
      const originalType = inputEl.type;
      inputEl.type = 'text';
      inputEl.value = nextValue;
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      inputEl.type = originalType;
    }, value);
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  async isDiscardEnabled(): Promise<boolean> {
    return this.discardButton.isEnabled();
  }

  async expandSection(sectionId: string) {
    const section = this.page.locator(`#${sectionId}`);
    const toggler = section.locator('.p-panel-toggle-button');
    if ((await toggler.count()) > 0) {
      const isExpanded = await toggler.getAttribute('aria-expanded');
      if (isExpanded === 'false') {
        await toggler.click();
        await expect(toggler).toHaveAttribute('aria-expanded', 'true');
      }
    }
  }

  async getAlertRowLabels(): Promise<string[]> {
    await this.goToAlertSection();
    const cells = this.alertSection.locator('tbody tr td:first-child');
    const count = await cells.count();
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await cells.nth(i).textContent();
      if (text) labels.push(text.trim());
    }
    return labels;
  }

  async pressSaveShortcut() {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+Enter`);
  }

  /** Wait for notification-settings POST and return parsed JSON body. */
  async saveAndCapturePayload(): Promise<Record<string, unknown>> {
    const [request] = await Promise.all([
      this.page.waitForRequest(
        (req) =>
          req.method() === 'POST' && req.url().includes('/settings/notification-settings/')
      ),
      this.clickSave(),
    ]);
    return request.postDataJSON() as Record<string, unknown>;
  }
}
