import { Locator, Page, expect } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/** Same 15 keys as FE `TRIP_STATUS_COLOR_KEYS` / PLANNING.md. */
export const TRIP_STATUS_COLOR_KEYS = [
  'planning',
  'pending',
  'waiting',
  'running',
  'driver_assigned',
  'completed',
  'canceled',
  'aborted',
  'rejected',
  'requested',
  'approved',
  'notconfirmed',
  'confirmed',
  'warning',
  'alarm',
] as const;

export type TripStatusColorKey = (typeof TRIP_STATUS_COLOR_KEYS)[number];

const STATUS_LABEL: Record<TripStatusColorKey, string> = {
  planning: 'Planning (without driver)',
  pending: 'Pending',
  waiting: 'Waiting',
  running: 'Running',
  driver_assigned: 'Driver assigned',
  completed: 'Completed',
  canceled: 'Canceled',
  aborted: 'Aborted',
  rejected: 'Rejected',
  requested: 'Requested to partner',
  approved: 'Approved by partner',
  notconfirmed: 'Partner driver not confirmed',
  confirmed: 'Partner driver confirmed',
  warning: 'Warning',
  alarm: 'Alarm',
};

const API_PATH = '/settings/planning-settings/';

export type PlanningSnapshot = {
  isAutoCloseTrip: boolean;
  hours: string;
  disableCancelTripForDriver: boolean;
  planningHex: string;
};

/**
 * Page Object for V5 Settings → Planning (`/settings/planning`).
 * Path has no `/v5` prefix — matches local FE `VITE_BASE_PATH=/`.
 */
export class PlanningSettingsPage {
  readonly page: Page;
  readonly settingsUrl: string;
  readonly settingsProfileUrl: string;

  readonly saveButton: Locator;
  readonly discardButton: Locator;

  readonly defaultsSection: Locator;
  readonly closureSection: Locator;
  readonly cancellationSection: Locator;
  readonly colorsSection: Locator;

  readonly pageHeading: Locator;
  readonly defaultsHereLink: Locator;
  readonly hoursInput: Locator;
  readonly autocloseSelect: Locator;
  readonly cancellationSelect: Locator;
  readonly planningMenuLink: Locator;
  readonly loadErrorMessage: Locator;

  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settingsUrl = routes.settings.planning();
    this.settingsProfileUrl = routes.settings.profile();

    this.saveButton = page.getByTestId('planning-settings-save');
    this.discardButton = page.getByTestId('planning-settings-discard');

    this.defaultsSection = page.locator('#defaults');
    this.closureSection = page.locator('#closure');
    this.cancellationSection = page.locator('#cancellation');
    this.colorsSection = page.locator('#trip-status-colors');

    this.pageHeading = page.getByRole('heading', { name: 'Planning', exact: true });
    this.defaultsHereLink = this.defaultsSection.getByRole('link', { name: 'here' });
    this.hoursInput = page.locator('input[id="autoCloseTripXHours"]');
    this.autocloseSelect = this.closureSection.locator('.p-selectbutton');
    this.cancellationSelect = this.cancellationSection.locator('.p-selectbutton');
    // SettingsMenu lives in `<aside>`, a sibling of `<main>` — not inside it.
    this.planningMenuLink = page.locator('aside').getByRole('link', { name: /Planning/ });
    this.loadErrorMessage = page.locator('.p-message-error, [class*="p-message"]');

    this.successToast = page.locator('.p-toast-message-success');
    this.errorToast = page.locator('.p-toast-message-error');
  }

  sectionPill(title: string): Locator {
    return this.page
      .getByRole('navigation', { name: 'Page sections' })
      .getByRole('button', { name: title });
  }

  colorPicker(key: TripStatusColorKey): Locator {
    return this.page.locator(`#${key}-picker`);
  }

  hexInput(key: TripStatusColorKey): Locator {
    return this.colorsSection.locator(
      `input[type="text"][aria-label="${STATUS_LABEL[key]}"]`,
    );
  }

  groupHeading(name: 'Regular trips' | 'Shared trips' | 'Alarm'): Locator {
    return this.colorsSection.getByRole('heading', { name, exact: true });
  }

  async goto() {
    const responsePromise = this.page.waitForResponse(
      (res) => res.url().includes(API_PATH) && res.request().method() === 'GET',
      { timeout: 30000 },
    );
    await this.page.goto(this.settingsUrl);
    await responsePromise.catch(() => null);
    await this.page.waitForLoadState('networkidle');
    await this.waitForPageReady();
  }

  async waitForPageReady() {
    const opts = { state: 'visible' as const, timeout: 30000 };
    await Promise.all([
      this.pageHeading.waitFor(opts),
      this.defaultsSection.waitFor(opts),
      this.closureSection.waitFor(opts),
      this.cancellationSection.waitFor(opts),
      this.colorsSection.waitFor(opts),
    ]);
  }

  async goToSection(id: 'defaults' | 'closure' | 'cancellation' | 'trip-status-colors') {
    const titles = {
      defaults: 'Planning defaults',
      closure: 'Closure',
      cancellation: 'Cancellation',
      'trip-status-colors': 'Trip status colors',
    } as const;
    await this.sectionPill(titles[id]).click();
    const section = this.page.locator(`#${id}`);
    await section.waitFor({ state: 'visible' });
    await section.scrollIntoViewIfNeeded();
  }

  async setYesNo(select: Locator, yes: boolean) {
    const label = yes ? 'Yes' : 'No';
    const option = select.locator('.p-togglebutton', { hasText: label });
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
  }

  async isYesSelected(select: Locator): Promise<boolean> {
    const yes = select.locator('.p-togglebutton', { hasText: 'Yes' });
    return (await yes.getAttribute('aria-pressed')) === 'true';
  }

  async fillHours(hours: number | string) {
    await this.goToSection('closure');
    // PrimeVue InputNumber only syncs via its input handler — fill() updates the
    // DOM but can leave the Vue model unchanged, so Save stays disabled.
    await this.hoursInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.hoursInput.pressSequentially(String(hours), { delay: 30 });
    await this.hoursInput.blur();
  }

  async fillHex(key: TripStatusColorKey, hexWithoutHash: string) {
    await this.goToSection('trip-status-colors');
    const input = this.hexInput(key);
    await input.click();
    await input.fill(hexWithoutHash);
    await input.blur();
  }

  async clickSave() {
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    await this.saveButton.click();
  }

  async clickDiscard() {
    await expect(this.discardButton).toBeEnabled({ timeout: 5000 });
    const [response] = await Promise.all([
      this.page
        .waitForResponse(
          (res) => res.url().includes(API_PATH) && res.request().method() === 'GET',
          { timeout: 10000 },
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
      const errorText = (await this.errorToast.first().textContent().catch(() => null))?.trim();
      if (errorText) {
        throw new Error(
          `Expected success toast${messageFragment ? ` containing "${messageFragment}"` : ''}, but error toast showed: ${errorText}`,
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
          (res) => res.url().includes(API_PATH) && res.request().method() === 'GET',
          { timeout: 10000 },
        )
        .catch(() => null),
      this.page.keyboard.press('Escape'),
    ]);
    await this.page.waitForTimeout(response ? 400 : 1000);
    await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

  async pressSaveShortcut() {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+Enter`);
  }

  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  async captureSnapshot(): Promise<PlanningSnapshot> {
    await this.goToSection('closure');
    const hours = await this.hoursInput.inputValue();
    const isAutoCloseTrip = await this.isYesSelected(this.autocloseSelect);
    await this.goToSection('cancellation');
    const disableCancelTripForDriver = await this.isYesSelected(this.cancellationSelect);
    await this.goToSection('trip-status-colors');
    const planningHex = (await this.hexInput('planning').inputValue()).replace(/^#/, '');
    return { isAutoCloseTrip, hours, disableCancelTripForDriver, planningHex };
  }

  async applySnapshot(snapshot: PlanningSnapshot) {
    await this.goToSection('closure');
    await this.setYesNo(this.autocloseSelect, snapshot.isAutoCloseTrip);
    await this.fillHours(snapshot.hours);
    await this.goToSection('cancellation');
    await this.setYesNo(this.cancellationSelect, snapshot.disableCancelTripForDriver);
    await this.fillHex('planning', snapshot.planningHex);
  }

  async restoreSnapshot(snapshot: PlanningSnapshot) {
    if (!this.page.url().includes('/settings/planning')) {
      await this.goto();
    }
    await this.applySnapshot(snapshot);
    if (await this.isSaveEnabled()) {
      await this.clickSave();
      await this.waitForSuccessToast('Planning settings saved');
    }
  }

  nextHours(current: string): number {
    const parsed = Number.parseInt(current, 10);
    if (Number.isNaN(parsed)) return 8;
    return parsed >= 23 ? 0 : parsed + 1;
  }

  nextHex(currentWithoutHash: string): string {
    const normalized = currentWithoutHash.replace(/^#/, '').toLowerCase();
    return normalized === '112233' ? '445566' : '112233';
  }

  async saveAndCapturePayload(): Promise<Record<string, unknown>> {
    const [request] = await Promise.all([
      this.page.waitForRequest(
        (req) => req.method() === 'POST' && req.url().includes(API_PATH),
        { timeout: 15000 },
      ),
      this.clickSave(),
    ]);
    return request.postDataJSON() as Record<string, unknown>;
  }

  async getHoursValidationError(): Promise<string> {
    const text = await this.closureSection.locator('small.text-red-500').first().textContent();
    return (text ?? '').trim();
  }

  async getHexValidationError(key: TripStatusColorKey): Promise<string> {
    const row = this.hexInput(key).locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
    const text = await row.locator('small.text-red-500').textContent();
    return (text ?? '').trim();
  }
}
