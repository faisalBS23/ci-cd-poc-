import { Locator, Page, Request, Response, expect } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

const TRIP_SETTINGS_PATH = '/settings/trip-settings/';

/**
 * Page Object for V5 Settings → Trip (`/settings/trip`).
 * Not Trip type (`/settings/trip-type`).
 */
export class TripSettingsPage {
  readonly page: Page;
  readonly settingsUrl: string;
  readonly settingsProfileUrl: string;
  readonly legacyAirportUrl: string;

  readonly pageHeading: Locator;
  readonly tripMenuLink: Locator;
  readonly timeAdditionsSection: Locator;
  readonly airportSection: Locator;
  readonly legPercentInput: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly addAirportButton: Locator;
  readonly table: Locator;
  readonly formDialog: Locator;
  readonly deleteDialog: Locator;
  readonly nameInput: Locator;
  readonly iataInput: Locator;
  readonly emailInput: Locator;
  readonly descriptionInput: Locator;
  readonly dialogSaveButton: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settingsUrl = routes.settings.trip();
    this.settingsProfileUrl = routes.settings.profile();
    this.legacyAirportUrl = routes.settings.tripAirportLegacy();

    this.pageHeading = page.getByRole('heading', { name: 'Trip', exact: true });
    // Settings menu accessible names include the PrimeIcon ligature (`" Trip"`).
    // `exact: 'Trip'` misses that; `/Trip$/` still excludes "Trip type".
    this.tripMenuLink = page.locator('aside').getByRole('link', { name: /Trip$/ });
    this.timeAdditionsSection = page.locator('#time-additions');
    this.airportSection = page.locator('#airport-trip');
    this.legPercentInput = page.getByLabel(/^Leg percentage/);

    this.saveButton = page.locator('.sticky').getByRole('button', { name: /Save/ });
    this.discardButton = page.locator('.sticky').getByRole('button', { name: /Discard/ });

    this.addAirportButton = page.getByRole('button', { name: 'Add Airport' });
    this.table = this.airportSection.getByRole('table');

    this.formDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /^(Add|Edit) airport$/i }),
    });
    this.deleteDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'Delete airport' }),
    });

    this.nameInput = this.formDialog.getByLabel(/^Name/);
    this.iataInput = this.formDialog.getByLabel(/^IATA/);
    this.emailInput = this.formDialog.getByLabel(/^Email/);
    this.descriptionInput = this.formDialog.getByLabel(/^Description/);
    this.dialogSaveButton = this.formDialog.getByRole('button', { name: 'Save', exact: true });

    this.successToast = page.locator('.p-toast-message-success');
    this.errorToast = page.locator('.p-toast-message-error');
  }

  sectionPill(title: string): Locator {
    return this.page
      .getByRole('navigation', { name: 'Page sections' })
      .getByRole('button', { name: title });
  }

  private isTripSettingsGet(response: Response): boolean {
    return (
      response.request().method() === 'GET' && response.url().includes(TRIP_SETTINGS_PATH)
    );
  }

  private isAirportListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/airports\/?(\?|$)/.test(response.url())
    );
  }

  private isAirportWriteResponse(
    response: Response,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/airports/')
    );
  }

  async goto() {
    const tripGet = this.page.waitForResponse(
      (res) => this.isTripSettingsGet(res),
      { timeout: 30000 }
    );
    const airportsGet = this.page.waitForResponse(
      (res) => this.isAirportListResponse(res),
      { timeout: 30000 }
    );
    await this.page.goto(this.settingsUrl);
    await Promise.all([tripGet.catch(() => null), airportsGet.catch(() => null)]);
    await this.page.waitForLoadState('networkidle');
    await this.waitForPageReady();
  }

  async gotoLegacyAirportAdmin() {
    await this.page.goto(this.legacyAirportUrl, { waitUntil: 'domcontentloaded' });
    await expect(this.pageHeading).toBeVisible({ timeout: 15000 });
    await expect(this.page).toHaveURL(/\/settings\/trip(?:\/|$|\?)/);
  }

  async waitForPageReady() {
    await this.pageHeading.waitFor({ state: 'visible', timeout: 30000 });
    await this.timeAdditionsSection.waitFor({ state: 'visible' });
    await this.airportSection.waitFor({ state: 'visible' });
    await this.legPercentInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.saveButton.waitFor({ state: 'visible' });
    await this.waitForAirportListSettled();
  }

  async waitForAirportListSettled() {
    await expect(this.table).toBeVisible({ timeout: 30000 });
    await expect(this.table.locator('tr.list-data-table-skeleton-row')).toHaveCount(0, {
      timeout: 30000,
    });
  }

  async goToSection(id: 'time-additions' | 'airport-trip') {
    // Scroll the section directly. The page-section pills use `behavior: 'smooth'`,
    // which races Playwright clicks (Add Airport missed the button while the card moved).
    const section = this.page.locator(`#${id}`);
    await section.waitFor({ state: 'visible' });
    await section.scrollIntoViewIfNeeded();
  }

  async fillLegPercent(value: number | string, options?: { commit?: boolean }) {
    await this.goToSection('time-additions');
    // PrimeVue InputNumber only writes v-model on blur — same as Planning hours.
    await this.legPercentInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.legPercentInput.pressSequentially(String(value), { delay: 30 });
    if (options?.commit !== false) {
      await this.legPercentInput.blur();
    }
  }

  async clearLegPercent() {
    await this.goToSection('time-additions');
    await this.legPercentInput.click();
    await this.page.keyboard.press('ControlOrMeta+a');
    await this.page.keyboard.press('Backspace');
    await this.legPercentInput.blur();
  }

  async clickSave() {
    await expect(this.saveButton).toBeEnabled({ timeout: 5000 });
    await this.saveButton.click();
  }

  async clickDiscard() {
    await expect(this.discardButton).toBeEnabled({ timeout: 5000 });
    await this.discardButton.click();
    await expect(this.saveButton).toBeDisabled({ timeout: 5000 });
  }

  async expectTripFabIdle() {
    await expect(this.saveButton).toBeDisabled();
    await expect(this.discardButton).toBeDisabled();
  }

  async expectTripFabDirty() {
    await expect(this.saveButton).toBeEnabled();
    await expect(this.discardButton).toBeEnabled();
  }

  async expectMapsHintAndNoPercentSuffix() {
    await this.goToSection('time-additions');
    await expect(this.timeAdditionsSection.getByText(/Maps/)).toBeVisible();
    await expect(this.timeAdditionsSection.getByText(/Google/i)).toHaveCount(0);
    await expect(this.timeAdditionsSection.getByText('%', { exact: true })).toHaveCount(0);
  }

  async expectAirportActiveStatus(name: string, active: boolean) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await expect(row.getByLabel(active ? 'Active' : 'Inactive', { exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Active', exact: true })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Inactive', exact: true })).toHaveCount(0);
  }

  async expectDialogText(text: string) {
    await expect(this.formDialog.getByText(text, { exact: true })).toBeVisible();
  }

  async expectNoDialogText(text: string) {
    await expect(this.formDialog.getByText(text, { exact: true })).toHaveCount(0);
  }

  async expectNoAirportCreatedToast() {
    await expect(this.page.getByText('Airport created')).toHaveCount(0);
  }

  async cancelAirportDialog() {
    await this.formDialog
      .getByRole('button', { name: 'Cancel' })
      .filter({ hasText: 'Cancel' })
      .click();
    await expect(this.formDialog).toBeHidden();
  }

  async expectNoTripSettingsPostDuring(action: () => Promise<void>) {
    let seen = false;
    const onRequest = (req: Request) => {
      if (req.method() === 'POST' && req.url().includes(TRIP_SETTINGS_PATH)) {
        seen = true;
      }
    };
    this.page.on('request', onRequest);
    try {
      await action();
      expect(seen).toBe(false);
    } finally {
      this.page.off('request', onRequest);
    }
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

  async expectNoToasts() {
    await expect(this.successToast).toHaveCount(0);
    await expect(this.errorToast).toHaveCount(0);
  }

  async getLegPercentValidationError(): Promise<string> {
    const text = await this.timeAdditionsSection.locator('small.text-red-500').first().textContent();
    return (text ?? '').trim();
  }

  nextLegPercent(current: string): number {
    const parsed = Number.parseInt(current, 10);
    if (Number.isNaN(parsed)) return 1;
    return parsed >= 99 ? 0 : parsed + 1;
  }

  async saveAndCaptureTripSettingsPayload(): Promise<Record<string, unknown>> {
    const [request] = await Promise.all([
      this.page.waitForRequest(
        (req) => req.method() === 'POST' && req.url().includes(TRIP_SETTINGS_PATH),
        { timeout: 15000 }
      ),
      this.clickSave(),
    ]);
    return request.postDataJSON() as Record<string, unknown>;
  }

  bodyRows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  searchRegion(): Locator {
    return this.airportSection.getByRole('search');
  }

  searchInput(): Locator {
    return this.searchRegion().getByRole('textbox', { name: 'Search airports' });
  }

  async expandSearchIfNeeded() {
    const region = this.searchRegion();
    if ((await region.getAttribute('aria-expanded')) === 'true') {
      await expect(this.searchInput()).toBeVisible();
      return;
    }
    await this.searchRegion().getByRole('button', { name: 'Search airports' }).click();
    await expect(region).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    await expect(this.searchInput()).toBeVisible();
  }

  async search(term: string) {
    await this.goToSection('airport-trip');
    await this.expandSearchIfNeeded();
    const input = this.searchInput();
    const list = this.page.waitForResponse(
      (response) =>
        this.isAirportListResponse(response) &&
        /[?&]search=/.test(response.url()) &&
        response.ok(),
      { timeout: 15000 }
    );
    // `fill` is one action. `pressSequentially` + config `slowMo: 500` on a long
    // `[AUTO] … Date.now()` name exceeds the 60s test timeout before `search=` fires.
    await input.fill(term);
    await list;
    await this.waitForAirportListSettled();
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

  async openCreate() {
    await this.goToSection('airport-trip');
    await this.waitForAirportListSettled();
    await expect(this.addAirportButton).toBeEnabled({ timeout: 15000 });
    await this.addAirportButton.click();
    await expect(this.formDialog).toBeVisible({ timeout: 10000 });
    await expect(this.formDialog.getByRole('heading', { name: 'Add airport' })).toBeVisible();
  }

  async openEditByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.formDialog).toBeVisible();
    await expect(this.formDialog.getByRole('heading', { name: 'Edit airport' })).toBeVisible();
  }

  async fillAirportForm(data: {
    name?: string;
    iata?: string;
    email?: string;
    description?: string;
    active?: boolean;
  }) {
    if (data.name != null) {
      await this.nameInput.fill(data.name);
    }
    if (data.iata != null) {
      await this.iataInput.fill(data.iata);
    }
    if (data.email != null) {
      await this.emailInput.fill(data.email);
    }
    if (data.description != null) {
      await this.descriptionInput.fill(data.description);
    }
    if (data.active != null) {
      const label = data.active ? 'Active' : 'Inactive';
      const option = this.formDialog.getByRole('button', { name: label, exact: true });
      if ((await option.getAttribute('aria-pressed')) !== 'true') {
        await option.click();
      }
      await expect(option).toHaveAttribute('aria-pressed', 'true');
    }
  }

  async saveAirportDialog(method: 'POST' | 'PUT', expectedStatus: number) {
    const expectSuccess = expectedStatus === 201 || expectedStatus === 200;
    const write = this.page.waitForResponse(
      (response) =>
        this.isAirportWriteResponse(response, method) && response.status() === expectedStatus,
      { timeout: 30000 }
    );
    const list = expectSuccess
      ? this.page.waitForResponse(
          (response) => this.isAirportListResponse(response) && response.ok(),
          { timeout: 30000 }
        )
      : null;
    await this.dialogSaveButton.click();
    const writeResponse = await write;
    if (expectSuccess && list) {
      await list.catch(() => undefined);
      await expect(this.formDialog).toBeHidden({ timeout: 15000 });
    }
    return writeResponse;
  }

  async saveAirportExpectingClientValidation() {
    await this.dialogSaveButton.click();
    await expect(this.formDialog).toBeVisible();
  }

  async dialogFieldError(label: RegExp | string): Promise<string> {
    const field = this.formDialog.getByLabel(label);
    const shell = field.locator('xpath=ancestor::div[contains(@class,"flex-col")][1]');
    const text = await shell.locator('small.text-red-500').textContent();
    return (text ?? '').trim();
  }

  async openDeleteByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog).toBeVisible();
  }

  async confirmDelete() {
    const del = this.page.waitForResponse(
      (response) => this.isAirportWriteResponse(response, 'DELETE') && response.status() === 204,
      { timeout: 30000 }
    );
    const list = this.page.waitForResponse(
      (response) => this.isAirportListResponse(response) && response.ok(),
      { timeout: 30000 }
    );
    await this.deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await del;
    await list.catch(() => undefined);
    await expect(this.deleteDialog).toBeHidden({ timeout: 15000 });
  }

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10000 });
  }
}
